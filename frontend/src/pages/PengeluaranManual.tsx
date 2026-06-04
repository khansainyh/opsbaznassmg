import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  FileText,
  Calendar,
  BookOpen,
  Coins,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { cn } from '../lib/utils';

interface BankAccount {
  account_id: string;
  nama_akun: string;
  tipe_kas: string;
  kelompok_dana: string;
  saldo: number;
  no_rekening?: string;
  coa_code: string;
}

interface ManualDraft {
  id: string;
  tanggalCatatan: string;
  tanggal: string;
  bankAccountId: string;
  bankName: string;
  keteranganBank: string;
  nominal: number;
  type: 'DEBIT' | 'KREDIT'; // DEBIT = Penerimaan, KREDIT = Penyaluran/Penggunaan
  status: 'PENDING' | 'RECONCILED';
}

export default function PengeluaranManual() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [recentDrafts, setRecentDrafts] = useState<ManualDraft[]>([]);
  
  // Form State
  const [tanggalCatatan, setTanggalCatatan] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalTransaksi, setTanggalTransaksi] = useState(new Date().toISOString().split('T')[0]);
  const type = 'KREDIT'; // Strictly Kredit (Pengeluaran)
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');

  // History Filter State
  const [filterAccountId, setFilterAccountId] = useState('ALL');

  // Status & Messages
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Fetch Data
  const fetchData = async () => {
    try {
      const [accountsRes, mutationsRes] = await Promise.all([
        axios.get('/api/finance/accounts'),
        axios.get('/api/mutations')
      ]);

      setAccounts(accountsRes.data);
      
      // Filter mutations to show manual drafts (which have tanggalCatatan set)
      const manualDrafts = mutationsRes.data.filter((m: any) => m.tanggalCatatan !== undefined);
      setRecentDrafts(manualDrafts);

      // Set default account if not set (must be a cash account)
      const cashList = accountsRes.data.filter((a: any) => a.tipe_kas === 'TUNAI');
      if (cashList.length > 0 && !sourceAccountId) {
        setSourceAccountId(cashList[0].account_id);
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat master data keuangan dari server.', 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedAccount = accounts.find(a => a.account_id === sourceAccountId);
  const numericNominal = parseFloat(nominal.replace(/[^0-9]/g, '')) || 0;
  
  // Warning if balance is exceeded
  const isOverdrawn = selectedAccount ? numericNominal > selectedAccount.saldo : false;

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    setNominal(rawVal);
  };

  // Submit Draft
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceAccountId) {
      showToast('Silakan pilih akun laci kas atau bank sumber.', 'error');
      return;
    }
    if (numericNominal <= 0) {
      showToast('Nominal transaksi harus lebih besar dari Rp 0.', 'error');
      return;
    }
    if (isOverdrawn) {
      showToast(`Saldo kas tidak mencukupi! Akun hanya memiliki Rp ${Number(selectedAccount?.saldo).toLocaleString('id-ID')}`, 'error');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        sourceAccountId,
        type,
        nominal: numericNominal,
        keterangan: keterangan,
        tanggalTransaksi,
        tanggalCatatan
      };

      const res = await axios.post('/api/finance/manual-expense', payload);

      if (res.data.success) {
        showToast(res.data.message || 'Transaksi gantung berhasil disimpan.', 'success');
        setNominal('');
        setKeterangan('');
        // Refresh drafts list and accounts
        await fetchData();
      } else {
        showToast(res.data.error || 'Gagal menyimpan transaksi gantung.', 'error');
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || 'Terjadi kesalahan sistem saat menyimpan transaksi.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter history list based on selected Account Filter
  const filteredDrafts = recentDrafts.filter(dr => {
    if (filterAccountId === 'ALL') return true;
    return dr.bankAccountId === filterAccountId;
  });

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Toast Notifikasi */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "fixed top-6 right-6 z-50 px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 border font-semibold text-xs",
              toast.type === 'success' ? "bg-emerald-50 text-emerald-800 border-emerald-100" : "bg-rose-50 text-rose-800 border-rose-100"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="size-5 text-emerald-600" /> : <AlertTriangle className="size-5 text-rose-600" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-xs font-medium text-slate-500"
      >
        <span className="hover:text-primary transition-colors cursor-pointer">Keuangan</span>
        <ChevronRight className="size-3 text-slate-400" />
        <span className="text-primary font-bold">Pencatatan Pengeluaran Manual</span>
      </motion.div>

      {/* Page Header */}
      <div className="space-y-1">
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Pencatatan Pengeluaran Manual</h2>
        <p className="text-slate-500 text-sm font-medium">Catat pengeluaran dana tunai secara manual (Non-Proposal) sebagai draft transaksi gantung yang akan dilabeli COA dan diverifikasi oleh tim Pelaporan.</p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Column (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Form Container */}
          <div className="bg-white rounded-2xl border border-primary/10 shadow-sm p-6 md:p-8 space-y-6">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              Formulir Pencatatan Pengeluaran Manual (Draft)
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tanggal Catatan & Tanggal Transaksi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="size-4 text-slate-400" />
                    Tanggal Catatan
                  </label>
                  <input
                    type="date"
                    value={tanggalCatatan}
                    onChange={(e) => setTanggalCatatan(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="size-4 text-slate-400" />
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    value={tanggalTransaksi}
                    onChange={(e) => setTanggalTransaksi(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
                    required
                  />
                </div>
              </div>

              {/* Sumber Kas (Sumber Dana Kas) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="size-4 text-slate-400" />
                  Sumber Kas (Sumber Dana Kas)
                </label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-bold text-slate-700"
                  required
                >
                  {accounts.filter(acc => acc.tipe_kas === 'TUNAI').map(acc => (
                    <option key={acc.account_id} value={acc.account_id}>
                      {acc.nama_akun} - (Rp {Number(acc.saldo).toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nominal & Format Help */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  Nominal Transaksi
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">Rp</span>
                  <input
                    type="text"
                    value={nominal ? parseInt(nominal).toLocaleString('id-ID') : ''}
                    onChange={handleNominalChange}
                    placeholder="Masukkan jumlah nominal..."
                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-lg font-black text-slate-900"
                    required
                  />
                </div>
                {numericNominal > 0 && (
                  <p className="text-[11px] font-bold text-slate-400">
                    Terbilang: <span className="text-primary italic"># {numericNominal.toLocaleString('id-ID')} Rupiah #</span>
                  </p>
                )}
              </div>

              {/* Keterangan */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Keterangan Pengeluaran / Memo</label>
                <textarea
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Detail penggunaan kas tunai. Contoh: Pembelian ATK bulanan laci A, konsumsi rapat koordinasi, atau biaya operational tak terduga..."
                  className="w-full h-24 p-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium resize-none"
                  required
                />
              </div>

              {/* Action Buttons */}
              <button
                type="submit"
                disabled={isLoading || isOverdrawn}
                className={`w-full h-12 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 ${
                  isOverdrawn 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                    : 'bg-primary hover:bg-primary/95 shadow-primary/25 cursor-pointer'
                }`}
              >
                <Save className="size-5" />
                {isLoading ? 'Menyimpan Draft...' : 'Simpan Draft Pengeluaran'}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar Info Column (Right 1 Column) */}
        <div className="space-y-8">
          
          {/* Real-time Balances */}
          <div className="bg-white rounded-2xl border border-primary/10 shadow-sm p-6 space-y-4">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <Coins className="size-4 text-primary" />
              Saldo Laci Kas (Tunai)
            </h4>
            <div className="divide-y divide-slate-50 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {accounts.filter(acc => acc.tipe_kas === 'TUNAI').map(acc => (
                <div key={acc.account_id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-700">{acc.nama_akun}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">COA: {acc.coa_code}</p>
                  </div>
                  <p className="text-sm font-black text-slate-900 shrink-0">
                    Rp {Number(acc.saldo).toLocaleString('id-ID')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Accounting Jurnal Preview */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
              <BookOpen className="size-4 text-rose-450" />
              DRAFT MUTASI GANTUNG
            </h4>

            {numericNominal > 0 ? (
              <div className="space-y-4 text-xs font-mono">
                {/* Info Draft */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800 space-y-2">
                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Status: Draft Gantung (Pending)</p>
                  <p className="font-bold text-slate-200">Keterangan: {keterangan || '-'}</p>
                  <p className="text-slate-350">Akun Kas: {selectedAccount?.nama_akun || '-'}</p>
                  <p className="text-slate-350">Arah Mutasi: <span className="text-rose-450 font-bold">Pengeluaran (Uang Keluar)</span></p>
                  <p className="text-right text-slate-200 font-black mt-2 text-sm border-t border-slate-700/50 pt-2">
                    Nominal: Rp {numericNominal.toLocaleString('id-ID')}
                  </p>
                </div>

                {/* Overdrawn warning */}
                {isOverdrawn && (
                  <div className="bg-rose-950/40 border border-rose-800/50 p-3 rounded-lg text-rose-300 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-450" />
                    <span>Perhatian: Nominal pengeluaran melebihi saldo kas yang tersedia!</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs font-mono">
                Masukkan nominal transaksi untuk melihat preview draf gantung.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Recent Manual Expenses Table */}
      <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/5 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <History className="size-5 text-primary" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Riwayat Draf Transaksi Terkini</h3>
          </div>
          
          {/* Table Filter by Account */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-primary/10">
            <Filter className="size-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter Akun Kas:</span>
            <select
              value={filterAccountId}
              onChange={(e) => setFilterAccountId(e.target.value)}
              className="text-xs font-bold text-slate-700 outline-none border-none cursor-pointer bg-transparent"
            >
              <option value="ALL">Semua Akun Kas</option>
              {accounts.filter(acc => acc.tipe_kas === 'TUNAI').map(acc => (
                <option key={acc.account_id} value={acc.account_id}>{acc.nama_akun}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/20 border-b border-slate-100">
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal Catat</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal Transaksi</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Sumber Kas</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Keterangan</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Jenis</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Nominal</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDrafts.length > 0 ? (
                filteredDrafts.map((dr) => (
                  <tr key={dr.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 text-xs text-slate-500 font-medium">
                      {new Date(dr.tanggalCatatan).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600 font-bold">
                      {new Date(dr.tanggal).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-3.5 text-xs font-semibold text-slate-700">
                      {dr.bankName}
                    </td>
                    <td className="px-6 py-3.5 text-xs font-medium text-slate-900 max-w-xs truncate">
                      {dr.keteranganBank}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        dr.type === 'DEBIT' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {dr.type === 'DEBIT' ? 'Penerimaan' : 'Pengeluaran'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-black text-slate-900 text-xs">
                      Rp {dr.nominal.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        dr.status === 'PENDING' 
                          ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {dr.status === 'PENDING' ? 'Gantung' : 'Selesai'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-xs font-medium">
                    Belum ada riwayat draft transaksi gantung yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
