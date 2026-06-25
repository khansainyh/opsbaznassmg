import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronRight, 
  Search, 
  Plus, 
  Eye, 
  ChevronLeft, 
  ChevronRight as ChevronRightIcon,
  X, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  DollarSign, 
  Layers,
  UserPlus,
  TrendingUp,
  FileSpreadsheet,
  Edit3,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import * as XLSX from 'xlsx';

// SummaryCard Component
function SummaryCard({ title, value, subtext, icon, colorClass }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-slate-900">{value}</h3>
        {subtext && <p className="text-xs text-slate-500 font-medium">{subtext}</p>}
      </div>
      <div className={cn("p-3 rounded-xl", colorClass || "bg-slate-50 text-slate-500")}>
        {icon}
      </div>
    </div>
  );
}

export default function PenerimaanZis() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super_Admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [simbaFilter, setSimbaFilter] = useState('Semua');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'simba-queue'>('all');
  const [npwzModalOpen, setNpwzModalOpen] = useState(false);
  const [selectedMuzakkiForNpwz, setSelectedMuzakkiForNpwz] = useState<any>(null);
  const [newNpwzValue, setNewNpwzValue] = useState('');
  
  const [selectedData, setSelectedData] = useState<any>(null);
  
  const [penerimaanData, setPenerimaanData] = useState<any[]>([]);
  const [muzakkiList, setMuzakkiList] = useState<any[]>([]);
  const [rkatList, setRkatList] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [coaList, setCoaList] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{type: 'success'|'error'|'warning', text: string}[]>([]);

  // Form State
  const [selectedMuzakkiId, setSelectedMuzakkiId] = useState('');
  const [selectedRkatId, setSelectedRkatId] = useState('');
  const [selectedCoaCode, setSelectedCoaCode] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [nominal, setNominal] = useState('');
  const [metodePembayaran, setMetodePembayaran] = useState('TRANSFER');
  const [tanggalPembayaran, setTanggalPembayaran] = useState(new Date().toISOString().split('T')[0]);
  const [keterangan, setKeterangan] = useState('');
  const [noKuitansi, setNoKuitansi] = useState('');
  const [muzakkiSearch, setMuzakkiSearch] = useState('');
  const [showMuzakkiDropdown, setShowMuzakkiDropdown] = useState(false);
  const [isOutsideRkat, setIsOutsideRkat] = useState(false);
  const [coaSearch, setCoaSearch] = useState('');
  const [isCoaDropdownOpen, setIsCoaDropdownOpen] = useState(false);

  // Quick register muzakki inside modal
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickNama, setQuickNama] = useState('');
  const [quickNik, setQuickNik] = useState('');
  const [quickHandphone, setQuickHandphone] = useState('');
  const [quickAddress, setQuickAddress] = useState('');
  const [quickKategori, setQuickKategori] = useState<'Perorangan' | 'Lembaga'>('Perorangan');
  const [quickJenisKelamin, setQuickJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');

  useEffect(() => {
    fetchData();
    fetchMetadata();

    const stored = localStorage.getItem('selected_muzakki_penerimaan');
    if (stored) {
      try {
        const muz = JSON.parse(stored);
        setSelectedMuzakkiId(muz.id);
        setMuzakkiSearch(muz.nama);
        setIsModalOpen(true);
      } catch (e) {
        console.error(e);
      }
      localStorage.removeItem('selected_muzakki_penerimaan');
    }
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
      const res = await axios.get('/api/penerimaan-zis');
      const list = res.data?.status === 'success' ? res.data.data : res.data;
      setPenerimaanData(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error(error);
      setMessages([{ type: 'error', text: 'Gagal memuat data Penerimaan ZIS.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [resMuzakki, resRkat, resAccounts, resCoas] = await Promise.all([
        axios.get('/api/muzakki'),
        axios.get('/api/rkat-pengumpulan'),
        axios.get('/api/finance/accounts'),
        axios.get('/api/finance/coa')
      ]);
      
      if (resMuzakki.data?.status === 'success') {
        setMuzakkiList(resMuzakki.data.data || []);
      } else {
        setMuzakkiList(Array.isArray(resMuzakki.data) ? resMuzakki.data : []);
      }

      const rkatData = resRkat.data?.status === 'success' ? resRkat.data.data : resRkat.data;
      setRkatList(Array.isArray(rkatData) ? rkatData : []);

      const accountsData = resAccounts.data?.status === 'success' ? resAccounts.data.data : resAccounts.data;
      setAccountsList(Array.isArray(accountsData) ? accountsData : []);

      const coaData = resCoas.data?.status === 'success' ? resCoas.data.data : resCoas.data;
      setCoaList(Array.isArray(coaData) ? coaData : []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRkatChange = (rkatId: string) => {
    setSelectedRkatId(rkatId);
    const rkat = rkatList.find(r => r.id === rkatId);
    const codes = rkat?.coa_codes ? rkat.coa_codes.split(',').map((c: string) => c.trim()).filter(Boolean) : [];
    if (codes.length > 0) {
      setSelectedCoaCode(codes[0]);
    } else {
      setSelectedCoaCode('');
    }
  };

  const filteredData = useMemo(() => {
    return penerimaanData.filter(item => {
      const matchesSearch = 
        (item.no_kuitansi && item.no_kuitansi.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.muzakki?.nama && item.muzakki.nama.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.muzakki?.npwz && item.muzakki.npwz.includes(searchTerm)) ||
        (item.rkat?.nama_program && item.rkat.nama_program.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'Semua' || item.rkat?.kategori === categoryFilter;
      const matchesSimba = activeTab === 'simba-queue' 
        ? item.status_simba === 'PENDING'
        : (simbaFilter === 'Semua' || item.status_simba === simbaFilter);

      return matchesSearch && matchesCategory && matchesSimba;
    });
  }, [penerimaanData, searchTerm, categoryFilter, simbaFilter, activeTab]);

  // Calculations for stats
  const stats = useMemo(() => {
    let total = 0;
    let zakat = 0;
    let infak = 0;
    let dskl = 0;

    penerimaanData.forEach(item => {
      const nominalVal = Number(item.nominal || 0);
      total += nominalVal;
      if (item.rkat?.kategori === 'Zakat') zakat += nominalVal;
      else if (item.rkat?.kategori === 'Infak') infak += nominalVal;
      else dskl += nominalVal;
    });

    return { total, zakat, infak, dskl };
  }, [penerimaanData]);

  const handleQuickRegisterMuzakki = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!quickNama || !quickAddress || !quickHandphone) {
      alert('Nama, Handphone/Telepon, dan Alamat wajib diisi');
      return;
    }

    try {
      const payload: any = {
        kategori: quickKategori,
        nama: quickNama,
        alamat: quickAddress,
        telepon: quickHandphone,
        status: 'Aktif'
      };

      if (quickKategori === 'Perorangan') {
        payload.nik = quickNik || `NIK-${Date.now()}`;
        payload.handphone = quickHandphone;
        payload.jenis_kelamin = quickJenisKelamin;
      } else {
        payload.cp_nama = quickNama;
        payload.cp_telepon = quickHandphone;
      }

      const res = await axios.post('/api/muzakki', payload);
      if (res.data.status === 'success') {
        const newMuzakki = res.data.data;
        setMuzakkiList(prev => [newMuzakki, ...prev]);
        setSelectedMuzakkiId(newMuzakki.id);
        setMuzakkiSearch(newMuzakki.nama);
        setShowQuickRegister(false);
        setQuickNama('');
        setQuickNik('');
        setQuickHandphone('');
        setQuickAddress('');
        setQuickJenisKelamin('Laki-laki');
        setMessages([{ type: 'success', text: `Muzakki ${newMuzakki.nama} berhasil diregistrasi secara instan!` }]);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Gagal meregistrasi Muzakki baru');
    }
  };

  const handleAddPenerimaan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMuzakkiId) {
      alert('Mohon pilih Muzakki terlebih dahulu.');
      return;
    }
    const needsRkat = !isOutsideRkat;
    if (needsRkat && !selectedRkatId) {
      alert('Mohon pilih program RKAT Pengumpulan.');
      return;
    }
    if (!selectedCoaCode) {
      alert('Mohon pilih Program Kegiatan (COA) / Akun Buku Besar.');
      return;
    }
    if (!selectedAccountId) {
      alert('Mohon pilih Rekening Penerima.');
      return;
    }
    if (!nominal || Number(nominal) <= 0) {
      alert('Mohon isi nominal setoran dengan benar.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        no_kuitansi: noKuitansi,
        muzakki_id: selectedMuzakkiId,
        rkat_id: needsRkat ? selectedRkatId : null,
        bank_account_id: selectedAccountId,
        coa_code: selectedCoaCode,
        nominal: Number(nominal),
        metode_pembayaran: metodePembayaran,
        tanggal_pembayaran: tanggalPembayaran,
        keterangan
      };

      const res = editingId 
        ? await axios.put(`/api/penerimaan-zis/${editingId}`, payload)
        : await axios.post('/api/penerimaan-zis', payload);

      if (res.data?.status === 'success' || res.status === 200 || res.status === 201 || res.data?.success) {
        setIsModalOpen(false);
        resetForm();
        fetchData();
        setMessages([{ 
          type: 'success', 
          text: editingId 
            ? 'Transaksi Penerimaan ZIS berhasil diperbarui!' 
            : 'Transaksi Penerimaan ZIS berhasil dicatat & Jurnal Keuangan terbentuk otomatis!' 
        }]);
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Gagal menyimpan transaksi.';
      alert(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (item: any) => {
    setEditingId(item.id);
    setSelectedMuzakkiId(item.muzakki_id);
    setMuzakkiSearch(item.muzakki?.nama || '');
    setSelectedRkatId(item.rkat_id || '');
    setSelectedCoaCode(item.coa_code || '');
    setSelectedAccountId(item.bank_account_id);
    setNominal(String(item.nominal || ''));
    setMetodePembayaran(item.metode_pembayaran || 'TRANSFER');
    if (item.tanggal_pembayaran) {
      setTanggalPembayaran(new Date(item.tanggal_pembayaran).toISOString().split('T')[0]);
    }
    setKeterangan(item.keterangan || '');
    setNoKuitansi(item.no_kuitansi || '');
    setIsOutsideRkat(!item.rkat_id);
    setCoaSearch('');
    setIsCoaDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenNpwzModal = (muzakki: any) => {
    setSelectedMuzakkiForNpwz(muzakki);
    setNewNpwzValue(muzakki?.npwz || '');
    setNpwzModalOpen(true);
  };

  const handleSaveNpwz = async () => {
    if (!newNpwzValue.trim()) {
      alert('NPWZ tidak boleh kosong.');
      return;
    }
    try {
      const res = await axios.put(`/api/muzakki/${selectedMuzakkiForNpwz.id}`, {
        npwz: newNpwzValue
      });
      if (res.data.status === 'success') {
        setMessages([{ type: 'success', text: `NPWZ Muzakki ${selectedMuzakkiForNpwz.nama} berhasil diregistrasi!` }]);
        setNpwzModalOpen(false);
        fetchData();
        fetchMetadata();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Gagal menyimpan NPWZ.');
    }
  };

  const toggleSimbaStatus = async (item: any) => {
    const nextStatus = item.status_simba === 'PENDING' ? 'SYNCED' : 'PENDING';
    try {
      const res = await axios.patch(`/api/penerimaan-zis/${item.id}/simba`, {
        status_simba: nextStatus
      });
      if (res.data.status === 'success') {
        setPenerimaanData(prev => prev.map(p => p.id === item.id ? res.data.data : p));
        setMessages([{ type: 'success', text: `Status SIMBA berhasil diperbarui ke ${nextStatus}!` }]);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui status SIMBA.');
    }
  };

  const handleDeletePenerimaan = async (item: any) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus transaksi ${item.no_kuitansi}? Tindakan ini akan mengembalikan saldo kas & menghapus jurnal realisasi.`)) {
      return;
    }

    try {
      const res = await axios.delete(`/api/penerimaan-zis/${item.id}`);
      if (res.data.status === 'success') {
        fetchData();
        setMessages([{ type: 'success', text: 'Transaksi berhasil dihapus & saldo dikoreksi.' }]);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Gagal menghapus transaksi.');
    }
  };

  const resetForm = () => {
    setSelectedMuzakkiId('');
    setSelectedRkatId('');
    setSelectedCoaCode('');
    setSelectedAccountId('');
    setNominal('');
    setMetodePembayaran('TRANSFER');
    setTanggalPembayaran(new Date().toISOString().split('T')[0]);
    setKeterangan('');
    setNoKuitansi('');
    setMuzakkiSearch('');
    setShowQuickRegister(false);
    setEditingId(null);
    setIsOutsideRkat(false);
    setCoaSearch('');
    setIsCoaDropdownOpen(false);
  };

  // Filtered muzakki list for autocomplete dropdown
  const filteredMuzakkiForDropdown = useMemo(() => {
    const list = Array.isArray(muzakkiList) ? muzakkiList : [];
    const search = (muzakkiSearch || '').toLowerCase();
    if (!search) return list.slice(0, 10);
    return list.filter(m => {
      const nama = String(m?.nama || '').toLowerCase();
      const npwz = String(m?.npwz || '').toLowerCase();
      const nik = String(m?.nik || '').toLowerCase();
      return nama.includes(search) || npwz.includes(search) || nik.includes(search);
    }).slice(0, 10);
  }, [muzakkiList, muzakkiSearch]);

  const filteredCoasForSearch = useMemo(() => {
    const basePenerimaan = coaList.filter(c => c.klasifikasi === 'Penerimaan' || c.coa_code.startsWith('4'));
    if (!coaSearch) return basePenerimaan;
    const term = coaSearch.toLowerCase();
    return basePenerimaan.filter(coa => 
      coa.coa_code.toLowerCase().includes(term) || 
      coa.nama_akun.toLowerCase().includes(term)
    );
  }, [coaList, coaSearch]);

  const exportToExcel = () => {
    const reportData = filteredData.map(item => ({
      'Tanggal Transaksi': new Date(item.tanggal_pembayaran).toLocaleDateString('id-ID'),
      'No Registrasi (NPWZ)': item.muzakki?.npwz || '-',
      'No Kuitansi / BSZ': item.no_kuitansi,
      'Nama Muzakki': item.muzakki?.nama || '-',
      'Jenis Dana': item.rkat?.kategori || '-',
      'Kegiatan (RKAT)': item.rkat?.nama_program || '-',
      'via (Kas & Bank)': item.bankAccount?.nama_akun || '-',
      'Program Kegiatan (COA)': item.rkat?.coa_codes || '-',
      'Nominal': Number(item.nominal || 0),
      'Status SIMBA': item.status_simba
    }));

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Penerimaan ZIS');
    XLSX.writeFile(workbook, `Penerimaan_ZIS_Laporan_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8">
      {/* Breadcrumbs & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center">
          <span className="text-slate-400">Pengumpulan</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Penerimaan ZIS</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Penerimaan ZIS
        </h2>
        <p className="text-slate-500 font-medium">
          Mencatat dan mengelola penerimaan dana zakat, infak, sedekah, dan dana sosial keagamaan lainnya.
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

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <SummaryCard 
          title="Total Penerimaan ZIS" 
          value={`Rp ${stats.total.toLocaleString('id-ID')}`} 
          subtext="Akumulasi seluruh setoran"
          icon={<DollarSign className="size-5 text-primary" />}
          colorClass="bg-primary/10 text-primary"
        />
        <SummaryCard 
          title="Penerimaan Zakat" 
          value={`Rp ${stats.zakat.toLocaleString('id-ID')}`} 
          subtext="Dana Zakat Maal & Fitrah"
          icon={<TrendingUp className="size-5 text-emerald-600" />}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard 
          title="Penerimaan Infak" 
          value={`Rp ${stats.infak.toLocaleString('id-ID')}`} 
          subtext="Sedekah & Infak Terikat/Bebas"
          icon={<Layers className="size-5 text-blue-600" />}
          colorClass="bg-blue-50 text-blue-600"
        />
      </motion.div>

      {/* Toolbar & Filter */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden"
      >
        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all active:scale-95",
              activeTab === 'all'
                ? "border-primary text-primary bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Semua Transaksi
          </button>
          <button
            onClick={() => setActiveTab('simba-queue')}
            className={cn(
              "px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 active:scale-95",
              activeTab === 'simba-queue'
                ? "border-primary text-primary bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Antrean SIMBA
            {penerimaanData.filter(item => item.status_simba === 'PENDING').length > 0 && (
              <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                {penerimaanData.filter(item => item.status_simba === 'PENDING').length}
              </span>
            )}
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                placeholder="Cari kuitansi, nama, NPWZ..."
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-10 py-2 focus:ring-primary focus:border-primary outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <select 
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary outline-none cursor-pointer"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="Semua">Kategori: Semua</option>
              <option value="Zakat">Zakat</option>
              <option value="Infak">Infak</option>
              <option value="DSKL">DSKL</option>
              <option value="CSR">CSR</option>
            </select>

            {/* Simba Sync Filter */}
            <select 
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary outline-none cursor-pointer"
              value={simbaFilter}
              onChange={(e) => setSimbaFilter(e.target.value)}
            >
              <option value="Semua">Status Simba: Semua</option>
              <option value="PENDING">PENDING (Belum Sync)</option>
              <option value="SYNCED">SYNCED (Sudah Sync)</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={exportToExcel}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
            >
              <FileSpreadsheet className="size-4" />
              Ekspor Excel
            </button>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Plus className="size-4" />
              Input Penerimaan ZIS
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center p-8 text-primary font-bold text-sm gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></span>
              Memuat data Penerimaan...
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                  <th className="px-6 py-4">Tanggal Transaksi</th>
                  <th className="px-6 py-4">NPWZ</th>
                  <th className="px-6 py-4">Nama Muzakki</th>
                  <th className="px-6 py-4">Jenis Dana</th>
                  <th className="px-6 py-4">Kegiatan (RKAT)</th>
                  <th className="px-6 py-4">via (Kas & Bank)</th>
                  <th className="px-6 py-4">Program Kegiatan (COA)</th>
                  <th className="px-6 py-4 text-right">Nominal</th>
                  <th className="px-6 py-4 text-center">Simba Sync</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                      Belum ada data penerimaan ZIS yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {new Date(item.tanggal_pembayaran).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 font-bold">
                        {item.muzakki?.npwz || '-'}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {item.muzakki?.nama || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded uppercase",
                          item.rkat?.kategori === 'Zakat' ? 'bg-emerald-100 text-emerald-800' :
                          item.rkat?.kategori === 'Infak' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        )}>
                          {item.rkat?.kategori || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {item.rkat?.nama_program || '-'}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {item.bankAccount?.nama_akun || '-'}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {item.rkat?.coa_codes ? item.rkat.coa_codes.split(',')[0].trim() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        Rp {Number(item.nominal || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          {item.status_simba === 'SYNCED' ? (
                            <span className="inline-flex px-2 py-0.5 text-[9px] font-black rounded-lg uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                              SYNCED
                            </span>
                          ) : (
                            <div className="flex items-center justify-center">
                              {(() => {
                                const hasNpwz = item.muzakki?.npwz && item.muzakki.npwz.trim().length > 0 && !item.muzakki.npwz.startsWith('PENDING') && !item.muzakki.npwz.startsWith('NIK-');
                                if (hasNpwz) {
                                  return (
                                    <button 
                                      onClick={() => toggleSimbaStatus(item)}
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-100 transition-all active:scale-95 flex items-center justify-center"
                                      title="Input Kas Masuk ke SIMBA"
                                    >
                                      <CheckCircle2 className="size-4" />
                                    </button>
                                  );
                                } else {
                                  return (
                                    <button 
                                      onClick={() => handleOpenNpwzModal(item.muzakki)}
                                      className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-650 rounded-xl border border-amber-100 transition-all active:scale-95 flex items-center justify-center"
                                      title="Registrasi NPWZ SIMBA (Belum ada NPWZ)"
                                    >
                                      <UserPlus className="size-4" />
                                    </button>
                                  );
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-amber-600 rounded-xl transition-colors" title="Edit">
                            <Edit3 className="size-4" />
                          </button>
                          <button 
                            onClick={() => { setSelectedData(item); setIsDetailModalOpen(true); }}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-primary rounded-xl transition-colors" title="Detail">
                            <Eye className="size-4" />
                          </button>
                          {isSuperAdmin && (
                            <button 
                              onClick={() => handleDeletePenerimaan(item)}
                              className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors" title="Hapus">
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/20 text-xs">
          <p className="text-slate-400 font-bold">
            Menampilkan 1-{Math.min(filteredData.length, 10)} dari {filteredData.length} transaksi
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

      {/* Input Modal */}
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
                <h3 className="text-xl font-black text-slate-900">{editingId ? 'Edit Penerimaan ZIS' : 'Input Penerimaan ZIS'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddPenerimaan} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                
                {/* Autocomplete Muzakki */}
                <div className="space-y-1 relative">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Muzakki *</label>
                    <button 
                      type="button" 
                      onClick={() => setShowQuickRegister(!showQuickRegister)}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="size-3" />
                      {showQuickRegister ? "Batal Register" : "+ Registrasi Cepat Muzakki"}
                    </button>
                  </div>

                  {showQuickRegister ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mt-1">
                      <p className="text-[9px] font-black text-primary uppercase tracking-widest">Registrasi Muzakki Instan</p>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setQuickKategori('Perorangan')}
                          className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all", quickKategori === 'Perorangan' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
                        >
                          Perorangan
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setQuickKategori('Lembaga')}
                          className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all", quickKategori === 'Lembaga' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
                        >
                          Lembaga
                        </button>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Nama Lengkap / Lembaga *" 
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none" 
                        value={quickNama} 
                        onChange={(e) => setQuickNama(e.target.value)} 
                      />
                      {quickKategori === 'Perorangan' && (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="NIK (KTP)" 
                            className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none" 
                            value={quickNik} 
                            onChange={(e) => setQuickNik(e.target.value)} 
                          />
                          <select
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none text-slate-600"
                            value={quickJenisKelamin}
                            onChange={(e) => setQuickJenisKelamin(e.target.value as 'Laki-laki' | 'Perempuan')}
                          >
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                          </select>
                        </div>
                      )}
                      <input 
                        type="text" 
                        placeholder="No Handphone *" 
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none" 
                        value={quickHandphone} 
                        onChange={(e) => setQuickHandphone(e.target.value)} 
                      />
                      <textarea 
                        placeholder="Alamat *" 
                        rows={2} 
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none" 
                        value={quickAddress} 
                        onChange={(e) => setQuickAddress(e.target.value)} 
                      />
                      <button 
                        type="button" 
                        onClick={handleQuickRegisterMuzakki} 
                        className="w-full bg-primary text-white text-xs font-bold py-2 rounded-lg"
                      >
                        Daftarkan & Pilih Muzakki
                      </button>
                    </div>
                  ) : (
                    <>
                      <input 
                        type="text" 
                        placeholder="Ketik nama, NIK, atau NPWZ Muzakki..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        value={muzakkiSearch}
                        onChange={(e) => {
                          setMuzakkiSearch(e.target.value);
                          setShowMuzakkiDropdown(true);
                        }}
                        onFocus={() => setShowMuzakkiDropdown(true)}
                      />
                      {showMuzakkiDropdown && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                          {filteredMuzakkiForDropdown.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 italic">Muzakki tidak ditemukan.</div>
                          ) : (
                            filteredMuzakkiForDropdown.map((muzakki) => (
                              <button
                                key={muzakki.id}
                                type="button"
                                className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 flex justify-between items-center text-xs"
                                onClick={() => {
                                  setSelectedMuzakkiId(muzakki.id);
                                  setMuzakkiSearch(muzakki.nama);
                                  setShowMuzakkiDropdown(false);
                                }}
                              >
                                <div>
                                  <p className="font-bold text-slate-800">{muzakki.nama}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">NPWZ: {muzakki.npwz || '-'}</p>
                                </div>
                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{muzakki.kategori}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                  {/* Checkbox Tidak Ada di RKAT */}
                  <div className="flex items-center gap-2 text-left mb-1">
                    <input 
                      type="checkbox" 
                      id="isOutsideRkat"
                      checked={isOutsideRkat}
                      onChange={(e) => {
                        setIsOutsideRkat(e.target.checked);
                        if (e.target.checked) {
                          setSelectedRkatId('');
                          setSelectedCoaCode('');
                        }
                      }}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <label htmlFor="isOutsideRkat" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      Tidak ada di RKAT (Penerimaan di luar RKAT)
                    </label>
                  </div>

                  {/* RKAT Program selection */}
                  <div className={`space-y-1 transition-all duration-300 ${isOutsideRkat ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kegiatan (RKAT) *</label>
                    <select 
                      required={!isOutsideRkat} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                      value={selectedRkatId}
                      onChange={(e) => handleRkatChange(e.target.value)}
                      disabled={isOutsideRkat}
                    >
                      <option value="">Pilih Kegiatan RKAT Pengumpulan...</option>
                      {rkatList.map(rkat => (
                        <option key={rkat.id} value={rkat.id}>
                          [{rkat.kategori}] {rkat.nama_program}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Program Kegiatan (COA) matching the selected Kegiatan (RKAT) */}
                  {!isOutsideRkat && selectedRkatId && (
                    <div className="space-y-1 animate-fade-in">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Program Kegiatan (COA) *</label>
                      <select
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer font-bold text-slate-700"
                        value={selectedCoaCode}
                        onChange={(e) => setSelectedCoaCode(e.target.value)}
                      >
                        {(() => {
                          const rkat = rkatList.find(r => r.id === selectedRkatId);
                          const codes = rkat?.coa_codes ? rkat.coa_codes.split(',').map((c: string) => c.trim()).filter(Boolean) : [];
                          return codes.map((code: string) => {
                            const coa = coaList.find(c => c.coa_code === code);
                            const label = coa ? `${code} - ${coa.nama_akun}` : `${code} - Penerimaan ${rkat?.nama_program || ''}`;
                            return (
                              <option key={code} value={code}>
                                {label}
                              </option>
                            );
                          });
                        })()}
                      </select>
                    </div>
                  )}

                  {/* 3. Akun Buku Besar (Penerimaan COA) - Outside RKAT search */}
                  {isOutsideRkat && (
                    <div className="space-y-1.5 text-left animate-fade-in">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                        Akun Buku Besar (Penerimaan COA) *
                      </label>
                      {selectedCoaCode ? (
                        <div className="flex items-center justify-between bg-primary/10 text-primary border border-primary/20 px-3 py-2 rounded-xl text-xs font-black">
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="size-4 shrink-0" />
                            Terpilih: {selectedCoaCode} - {coaList.find(c => c.coa_code === selectedCoaCode)?.nama_akun || 'Memuat...'}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => {
                              setSelectedCoaCode('');
                              setCoaSearch('');
                            }} 
                            className="hover:text-rose-600"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 size-3.5" />
                            <input 
                              type="text"
                              placeholder="Cari kode COA atau nama akun Penerimaan..."
                              value={coaSearch}
                              onChange={(e) => setCoaSearch(e.target.value)}
                              onFocus={() => setIsCoaDropdownOpen(true)}
                              onBlur={() => setTimeout(() => setIsCoaDropdownOpen(false), 205)}
                              className="w-full text-xs font-semibold bg-slate-50 border-none rounded-lg pl-9 pr-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>

                          {(isCoaDropdownOpen || coaSearch) && (
                            <div className="bg-white border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs font-bold shadow-inner text-left">
                              {filteredCoasForSearch.length === 0 ? (
                                <p className="p-2 text-[10px] text-slate-400 italic">COA tidak ditemukan</p>
                              ) : (
                                filteredCoasForSearch.map(coa => (
                                  <div 
                                    key={coa.coa_code}
                                    onClick={() => {
                                      setSelectedCoaCode(coa.coa_code);
                                      setCoaSearch('');
                                      setIsCoaDropdownOpen(false);
                                    }}
                                    className="p-2 hover:bg-slate-50 cursor-pointer flex flex-col gap-0.5 text-slate-700"
                                  >
                                    <span className="font-mono text-primary text-[11px]">{coa.coa_code}</span>
                                    <span className="text-slate-650 text-[10px]">{coa.nama_akun}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <input 
                        type="text" 
                        value={selectedCoaCode} 
                        required 
                        onChange={() => {}} 
                        className="sr-only h-0 w-0" 
                      />
                    </div>
                  )}

                 {/* Bank Account / Kas selection */}
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">via Kas & Bank *</label>
                   <select 
                     required 
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                     value={selectedAccountId}
                     onChange={(e) => setSelectedAccountId(e.target.value)}
                   >
                      <option value="">Pilih Rekening Tujuan...</option>
                      {!accountsList.some(acc => acc.account_id === 'non_kas') && (
                        <option value="non_kas">Non Kas</option>
                      )}
                      {accountsList.map(acc => {
                        const isNonKas = acc.account_id === 'non_kas';
                        return (
                          <option key={acc.account_id} value={acc.account_id}>
                            {acc.nama_akun} {!isNonKas ? `(Saldo: Rp ${Number(acc.saldo).toLocaleString('id-ID')})` : ''}
                          </option>
                        );
                      })}
                    </select>
                 </div>

                 {/* Nominal */}
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal (Rp) *</label>
                   <input 
                     required 
                     type="number" 
                     placeholder="Nominal setoran..." 
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                     value={nominal}
                     onChange={(e) => setNominal(e.target.value)}
                   />
                 </div>

                {/* Metode & Tanggal */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode Pembayaran *</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                      value={metodePembayaran}
                      onChange={(e) => setMetodePembayaran(e.target.value)}
                    >
                      <option value="TRANSFER">Transfer Bank</option>
                      <option value="TUNAI">Kas Tunai</option>
                      <option value="QRIS">QRIS</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Setor *</label>
                    <input 
                      required 
                      type="date" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      value={tanggalPembayaran}
                      onChange={(e) => setTanggalPembayaran(e.target.value)}
                    />
                  </div>
                </div>

                {/* Keterangan */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan / Memo</label>
                  <textarea 
                    rows={2} 
                    placeholder="Catatan transfer atau nomor referensi..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                  />
                </div>

                {/* Preview Accounting Entries helper */}
                {nominal && Number(nominal) > 0 && selectedAccountId && (selectedRkatId || (isOutsideRkat && selectedCoaCode)) && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-[11px]">
                    <span className="font-bold text-slate-500 uppercase tracking-wider block">Preview Entri Jurnal Akuntansi</span>
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>
                        <span className="font-bold text-emerald-600">DEBIT</span>
                        <p className="font-medium truncate">{accountsList.find(a => a.account_id === selectedAccountId)?.nama_akun || 'Rekening'}</p>
                        <p className="font-mono text-slate-400">Rp {Number(nominal).toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <span className="font-bold text-blue-600">KREDIT</span>
                        <p className="font-medium truncate">
                          {isOutsideRkat 
                            ? `Penerimaan di luar RKAT (${coaList.find(c => c.coa_code === selectedCoaCode)?.nama_akun || selectedCoaCode || 'COA'})`
                            : `Pendapatan ${rkatList.find(r => r.id === selectedRkatId)?.nama_program || 'Program'}`
                          }
                        </p>
                        <p className="font-mono text-slate-400">Rp {Number(nominal).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-6 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all"
                  >
                    Simpan Penerimaan
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900">Detail Penerimaan ZIS</h3>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kuitansi / BSZ</p>
                    <p className="text-sm font-bold text-slate-900 font-mono">{selectedData.no_kuitansi}</p>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 text-[9px] font-black rounded-lg uppercase tracking-wider border",
                    selectedData.status_simba === 'SYNCED' 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                      : "bg-amber-50 text-amber-700 border-amber-100"
                  )}>
                    SIMBA: {selectedData.status_simba}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Muzakki</p>
                    <p className="text-sm font-bold text-slate-800">{selectedData.muzakki?.nama || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NPWZ</p>
                    <p className="text-sm font-bold font-mono text-slate-700">{selectedData.muzakki?.npwz || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori Dana</p>
                    <p className="text-sm font-bold text-slate-800">{selectedData.rkat?.kategori || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Setor</p>
                    <p className="text-sm font-bold text-slate-800">
                      {new Date(selectedData.tanggal_pembayaran).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kegiatan (RKAT)</p>
                  <p className="text-sm font-bold text-slate-800">{selectedData.rkat?.nama_program || '-'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Program Kegiatan (COA)</p>
                  <p className="text-sm font-bold text-slate-850">
                    {(() => {
                      const coa = coaList.find(c => c.coa_code === selectedData.coa_code);
                      return coa ? `${selectedData.coa_code} - ${coa.nama_akun}` : (selectedData.coa_code || '-');
                    })()}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akun Penerima (via)</p>
                  <p className="text-sm font-bold text-slate-800">{selectedData.bankAccount?.nama_akun || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal Setoran</p>
                    <p className="text-lg font-black text-slate-900">
                      Rp {Number(selectedData.nominal || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode</p>
                    <p className="text-sm font-bold text-slate-800">{selectedData.metode_pembayaran}</p>
                  </div>
                </div>

                <div className="space-y-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memo / Keterangan</p>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{selectedData.keterangan || 'Tidak ada catatan.'}</p>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registrasi NPWZ SIMBA Modal */}
      <AnimatePresence>
        {npwzModalOpen && selectedMuzakkiForNpwz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setNpwzModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-slate-900">Registrasi NPWZ SIMBA</h3>
                <button onClick={() => setNpwzModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Muzakki</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedMuzakkiForNpwz.nama}</p>
                  <p className="text-slate-500 mt-1 font-medium">{selectedMuzakkiForNpwz.alamat}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor Pokok Wajib Zakat (NPWZ) *</label>
                  <input 
                    type="text" 
                    placeholder="Masukkan NPWZ 15 digit..." 
                    maxLength={15}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono font-bold"
                    value={newNpwzValue}
                    onChange={(e) => setNewNpwzValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setNpwzModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={handleSaveNpwz}
                  className="w-1/2 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
                >
                  Simpan & Registrasi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
