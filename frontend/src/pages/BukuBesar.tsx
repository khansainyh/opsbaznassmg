import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Search, 
  BookOpen, 
  TrendingUp,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';

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
  kelompok_dana: 'ZAKAT' | 'INFAK_TERIKAT' | 'INFAK_TIDAK_TERIKAT' | 'AMIL' | 'APBD' | 'NON-HALAL' | 'PENYIMPANAN';
  saldo: number;
}

export interface LedgerEntryItem {
  entry_id: string;
  transaksi_id: string;
  coa_code: string;
  debit: number;
  kredit: number;
  account_id?: string;
  coa: COAItem;
  account?: BankAccountItem;
  realisasi: {
    transaksi_id: string;
    proposal_id?: string;
    rkat_id?: string;
    tanggal: string;
    keterangan: string;
  };
}

// Helper for formatting IDR currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value);
};

export default function BukuBesar() {
  const [ledger, setLedger] = useState<LedgerEntryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch Ledger on Mount
  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://127.0.0.1:4000/api/finance/ledger');
      setLedger(res.data);
    } catch (e) {
      console.error('Gagal mengambil data buku besar:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  // Filter Ledger Entries
  const filteredLedger = useMemo(() => {
    return ledger.filter(l => 
      l.realisasi.keterangan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.coa_code.includes(searchTerm) ||
      l.coa.nama_akun.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.account?.nama_akun || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [ledger, searchTerm]);

  // Compute total debit/kredit of filtered list
  const totalDebit = useMemo(() => {
    return filteredLedger.reduce((sum, item) => sum + Number(item.debit || 0), 0);
  }, [filteredLedger]);

  const totalKredit = useMemo(() => {
    return filteredLedger.reduce((sum, item) => sum + Number(item.kredit || 0), 0);
  }, [filteredLedger]);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest">
            <BookOpen className="size-4" />
            Keuangan &amp; Pelaporan
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Buku Besar Jurnal</h2>
          <p className="text-slate-500 font-medium text-xs md:text-sm">
            Tinjau seluruh pencatatan transaksi kas masuk, keluar, dan mutasi internal BAZNAS Kota Semarang secara real-time.
          </p>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"
        >
          <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="size-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Debit Jurnal</span>
            <p className="text-lg font-black text-slate-800">{formatCurrency(totalDebit)}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"
        >
          <div className="size-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="size-6 rotate-90" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Kredit Jurnal</span>
            <p className="text-lg font-black text-slate-800">{formatCurrency(totalKredit)}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"
        >
          <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Activity className="size-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Jumlah Baris Transaksi</span>
            <p className="text-lg font-black text-slate-800">{filteredLedger.length} Baris Jurnal</p>
          </div>
        </motion.div>
      </div>

      {/* Filter and Ledger Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input 
              type="text"
              placeholder="Cari transaksi buku besar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm bg-slate-50 border-none rounded-xl pl-10 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
            />
          </div>
          
          <button
            onClick={fetchLedger}
            disabled={loading}
            className="px-4 py-2 text-xs bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all shrink-0 self-start sm:self-center"
          >
            {loading ? 'Me-refresh...' : 'Refresh Jurnal'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Jurnal</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan Jurnal (Realisasi)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode COA</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Akun COA</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Debet (IDR)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Kredit (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">Buku besar jurnal kosong / Tidak ditemukan</td>
                </tr>
              ) : filteredLedger.map((item) => (
                <tr key={item.entry_id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-5 font-mono text-xs text-slate-600 font-bold">
                    {new Date(item.realisasi.tanggal).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-5 font-bold text-slate-800">
                    {item.realisasi.keterangan}
                    {item.account && <span className="block text-[10px] text-slate-400 mt-1 font-semibold">Kas Fisik: {item.account.nama_akun}</span>}
                  </td>
                  <td className="px-6 py-5 font-mono text-xs text-slate-650 font-bold">{item.coa_code}</td>
                  <td className="px-6 py-5 font-bold text-slate-800">{item.coa.nama_akun}</td>
                  <td className="px-6 py-5 text-right font-black text-emerald-700">
                    {Number(item.debit) > 0 ? formatCurrency(Number(item.debit)) : '-'}
                  </td>
                  <td className="px-6 py-5 text-right font-black text-blue-700">
                    {Number(item.kredit) > 0 ? formatCurrency(Number(item.kredit)) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
