import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  CreditCard, 
  FileText,
  Calendar,
  BookOpen,
  HelpCircle,
  Coins,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';

interface BankAccount {
  account_id: string;
  nama_akun: string;
  tipe_kas: string;
  kelompok_dana: string;
  saldo: number;
  no_rekening?: string;
  kode_laci?: string;
  coa_code: string;
}

interface COA {
  coa_code: string;
  nama_akun: string;
  klasifikasi: string;
  tipe_dana?: string;
}

interface RecentExpense {
  entry_id: string;
  transaksi_id: string;
  coa_code: string;
  debit: string;
  kredit: string;
  account_id?: string;
  realisasi: {
    tanggal: string;
    keterangan: string;
  };
  coa: {
    nama_akun: string;
  };
  account?: {
    account_id: string;
    nama_akun: string;
  };
}

// Predefined Categories mapped to specific COA codes automatically
const CATEGORY_COA_MAP: Record<string, { coa: string; label: string }> = {
  'Gaji Karyawan / Amil': { coa: '520101001', label: 'Beban Gaji Amil' },
  'Operasional Kantor (Listrik, Air, Internet)': { coa: '520101002', label: 'Beban Listrik, Air & Internet' },
  'Transportasi / Perjalanan Dinas': { coa: '520101003', label: 'Beban Transportasi & Perjalanan Dinas' },
  'Bantuan Darurat Langsung (Semarang Peduli)': { coa: '510101001', label: 'Penyaluran Program Semarang Peduli' },
  'Bantuan Kesehatan Darurat (Semarang Sehat)': { coa: '510201001', label: 'Penyaluran Program Semarang Sehat' },
  'Bantuan Pendidikan Darurat (Semarang Cerdas)': { coa: '510301001', label: 'Penyaluran Program Semarang Cerdas' },
  'Bantuan Keagamaan (Semarang Taqwa)': { coa: '510401001', label: 'Penyaluran Program Semarang Taqwa' },
  'Keperluan Lainnya': { coa: '520101004', label: 'Beban Operasional Lainnya' }
};

export default function PengeluaranManual() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [coas, setCoas] = useState<COA[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([]);
  
  // Form State
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [kategori, setKategori] = useState('Gaji Karyawan / Amil');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');

  // History Filter State
  const [filterKasId, setFilterKasId] = useState('ALL');

  // Status & Messages
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch Data
  const fetchData = async () => {
    try {
      const [accountsRes, coaRes, ledgerRes] = await Promise.all([
        axios.get('http://127.0.0.1:4000/api/finance/accounts'),
        axios.get('http://127.0.0.1:4000/api/finance/coa'),
        axios.get('http://127.0.0.1:4000/api/finance/ledger')
      ]);

      // Only display Cash accounts (TUNAI) for this screen
      const cashOnlyAccounts = accountsRes.data.filter((a: BankAccount) => a.tipe_kas === 'TUNAI');
      setAccounts(cashOnlyAccounts);
      
      setCoas(coaRes.data);

      // Filter ledger entries to show manual expenses (having realisasi.keterangan containing [Pengeluaran Manual])
      const manualEntries = ledgerRes.data.filter((e: any) => 
        e.realisasi?.keterangan?.includes('[Pengeluaran Manual]') && parseFloat(e.debit) > 0
      );
      setRecentExpenses(manualEntries);

      // Set default cash account
      if (cashOnlyAccounts.length > 0 && !sourceAccountId) {
        setSourceAccountId(cashOnlyAccounts[0].account_id);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Gagal memuat master data keuangan dari server.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get resolved debit COA for the selected Kategori
  const resolvedDebitCoaCode = CATEGORY_COA_MAP[kategori]?.coa || '510101001';
  
  const selectedAccount = accounts.find(a => a.account_id === sourceAccountId);
  const selectedCoa = coas.find(c => c.coa_code === resolvedDebitCoaCode);
  const numericNominal = parseFloat(nominal.replace(/[^0-9]/g, '')) || 0;
  const isOverdrawn = selectedAccount ? numericNominal > selectedAccount.saldo : false;

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    setNominal(rawVal);
  };

  // Submit Expense
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!sourceAccountId) {
      setErrorMsg('Silakan pilih rekening laci kas sumber.');
      return;
    }
    if (numericNominal <= 0) {
      setErrorMsg('Nominal pengeluaran harus lebih besar dari Rp 0.');
      return;
    }
    if (isOverdrawn) {
      setErrorMsg(`Saldo kas tidak mencukupi! Laci kas hanya memiliki Rp ${Number(selectedAccount?.saldo).toLocaleString('id-ID')}`);
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        sourceAccountId,
        debitCoaCode: resolvedDebitCoaCode,
        nominal: numericNominal,
        keterangan: `[Pengeluaran Manual] Kategori: ${kategori} - ${keterangan}`,
        tanggal
      };

      const res = await axios.post('http://127.0.0.1:4000/api/finance/manual-expense', payload);

      if (res.data.success) {
        setSuccessMsg(res.data.message);
        setNominal('');
        setKeterangan('');
        // Refresh balances and history list
        await fetchData();
      } else {
        setErrorMsg(res.data.error || 'Gagal menyimpan transaksi.');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.response?.data?.error || 'Terjadi kesalahan sistem saat menyimpan transaksi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter history list based on selected Kas Filter
  const filteredExpenses = recentExpenses.filter(exp => {
    if (filterKasId === 'ALL') return true;
    return exp.account_id === filterKasId || exp.account?.account_id === filterKasId;
  });

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-xs font-medium text-slate-500"
      >
        <span className="hover:text-primary transition-colors cursor-pointer">Keuangan</span>
        <ChevronRight className="size-3 text-slate-400" />
        <span className="text-primary font-bold">Input Pengeluaran Manual (Kas)</span>
      </motion.div>

      {/* Page Header */}
      <div className="space-y-1">
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Pencatatan Pengeluaran Manual (Kas)</h2>
        <p className="text-slate-500 text-sm font-medium">Catat pengeluaran tunai langsung dari laci kasir (Non-Proposal) untuk operasional rutin kantor, gaji amil, dan keperluan operasional lainnya.</p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Column (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Notifications */}
          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3"
            >
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Berhasil!</p>
                <p className="text-xs text-emerald-700 mt-0.5">{successMsg}</p>
              </div>
            </motion.div>
          )}

          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3"
            >
              <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Kesalahan Pengisian</p>
                <p className="text-xs text-rose-700 mt-0.5">{errorMsg}</p>
              </div>
            </motion.div>
          )}

          {/* Form Container */}
          <div className="bg-white rounded-2xl border border-primary/10 shadow-sm p-6 md:p-8 space-y-6">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              Formulir Kas Keluar
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tanggal & Kategori */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="size-4 text-slate-400" />
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="size-4 text-slate-400" />
                    Kategori Pengeluaran (Ter-mapping Otomatis)
                  </label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-bold text-slate-700"
                  >
                    {Object.keys(CATEGORY_COA_MAP).map(catKey => (
                      <option key={catKey} value={catKey}>{catKey}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Laci Sumber & Resolved COA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="size-4 text-slate-400" />
                    Laci Kasir Sumber
                  </label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-bold text-slate-700"
                    required
                  >
                    {accounts.map(acc => (
                      <option key={acc.account_id} value={acc.account_id}>
                        {acc.nama_akun} - (Rp {Number(acc.saldo).toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="size-4 text-slate-400" />
                    COA Beban Ter-mapping (AUTO)
                  </label>
                  <div className="w-full h-11 px-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center text-xs font-bold text-slate-500">
                    [{resolvedDebitCoaCode}] - {selectedCoa?.nama_akun || CATEGORY_COA_MAP[kategori]?.label || 'Beban'}
                  </div>
                </div>
              </div>

              {/* Nominal & Format Help */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  Nominal Pengeluaran
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">Rp</span>
                  <input
                    type="text"
                    value={nominal ? parseInt(nominal).toLocaleString('id-ID') : ''}
                    onChange={handleNominalChange}
                    placeholder="Masukkan jumlah pengeluaran..."
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
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Keterangan Tambahan / Memo</label>
                <textarea
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Detail penggunaan kas tunai. Contoh: Pembelian ATK bulanan, pembayaran listrik laci A..."
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
                {isLoading ? 'Menyimpan & Menjurnal...' : 'Simpan & Posting Jurnal'}
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
              Saldo Laci Kasir (Tunai)
            </h4>
            <div className="divide-y divide-slate-50">
              {accounts.map(acc => (
                <div key={acc.account_id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-700">{acc.nama_akun}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">COA: {acc.coa_code}</p>
                  </div>
                  <p className="text-sm font-black text-slate-900">
                    Rp {Number(acc.saldo).toLocaleString('id-ID')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Accounting Jurnal Preview */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
              <BookOpen className="size-4 text-emerald-400" />
              PREVIEW JURNAL KELAS AKUNTANSI
            </h4>

            {numericNominal > 0 ? (
              <div className="space-y-4 text-xs font-mono">
                {/* Debit */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">DEBIT (Alokasi Beban / Penyaluran)</p>
                  <p className="font-bold mt-1 text-slate-200">COA {resolvedDebitCoaCode}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{selectedCoa?.nama_akun || CATEGORY_COA_MAP[kategori]?.label || 'Nama Akun Beban'}</p>
                  <p className="text-right text-emerald-400 font-bold mt-1">
                    + Rp {numericNominal.toLocaleString('id-ID')}
                  </p>
                </div>

                {/* Kredit */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-wider">KREDIT (Pengurangan Kas Laci)</p>
                  <p className="font-bold mt-1 text-slate-200">COA {selectedAccount?.coa_code || '1102xxxx'}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{selectedAccount?.nama_akun || 'Laci Kasir Sumber'}</p>
                  <p className="text-right text-rose-400 font-bold mt-1">
                    - Rp {numericNominal.toLocaleString('id-ID')}
                  </p>
                </div>

                {/* Overdrawn warning */}
                {isOverdrawn && (
                  <div className="bg-rose-950/40 border border-rose-800/50 p-3 rounded-lg text-rose-300 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>Perhatian: Nominal melebihi saldo kas yang tersedia!</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs font-mono">
                Silakan masukkan nominal pengeluaran untuk melihat draf jurnal akuntansi.
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
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Riwayat Pengeluaran Kas Terkini</h3>
          </div>
          
          {/* Table Filter by Kas */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-primary/10">
            <Filter className="size-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter Kas:</span>
            <select
              value={filterKasId}
              onChange={(e) => setFilterKasId(e.target.value)}
              className="text-xs font-bold text-slate-700 outline-none border-none cursor-pointer bg-transparent"
            >
              <option value="ALL">Semua Laci Kas</option>
              {accounts.map(acc => (
                <option key={acc.account_id} value={acc.account_id}>{acc.nama_akun}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/20 border-b border-slate-100">
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Deskripsi / Keterangan</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Akun Beban (Debet)</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Laci Kasir (Kredit)</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp) => (
                  <tr key={exp.entry_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 text-xs text-slate-600 font-bold">
                      {new Date(exp.realisasi.tanggal).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-3.5 text-xs font-medium text-slate-900 max-w-xs truncate">
                      {exp.realisasi.keterangan}
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="text-xs font-bold text-slate-700">{exp.coa.nama_akun}</p>
                      <p className="text-[10px] text-slate-400 font-bold">COA: {exp.coa_code}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="text-xs font-bold text-slate-700">{exp.account?.nama_akun || 'Laci Kasir'}</p>
                    </td>
                    <td className="px-6 py-3.5 text-right font-black text-rose-600 text-xs">
                      Rp {parseFloat(exp.debit).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs font-medium">
                    Belum ada riwayat pengeluaran kas yang sesuai filter.
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
