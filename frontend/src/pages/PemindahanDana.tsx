import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  ArrowRightLeft,
  ChevronDown,
  Check,
  ChevronRight,
  History,
  Search
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

// Helper for formatting IDR currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value);
};

export default function PemindahanDana() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [replenishments, setReplenishments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states - Replenishment
  const [replenishBank, setReplenishBank] = useState('');
  const [replenishKeterangan, setReplenishKeterangan] = useState('');
  const [replenishAllocations, setReplenishAllocations] = useState<Array<{ targetAccountId: string, nominal: number }>>([
    { targetAccountId: '', nominal: 0 }
  ]);
  const [isSourceBankDropdownOpen, setIsSourceBankDropdownOpen] = useState(false);
  const [openTargetDropdownIdx, setOpenTargetDropdownIdx] = useState<number | null>(null);

  // Fetch replenishments history
  const fetchReplenishments = async () => {
    try {
      const res = await axios.get('/api/finance/replenish');
      setReplenishments(res.data);
    } catch (e) {
      console.error('Gagal mengambil riwayat pemindahan dana:', e);
    }
  };

  // Fetch accounts on mount
  const fetchAccounts = async () => {
    try {
      const res = await axios.get('/api/finance/accounts');
      setAccounts(res.data);
    } catch (e) {
      console.error('Gagal mengambil data akun keuangan:', e);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchReplenishments();
  }, []);

  const filteredReplenishments = replenishments.filter(rep => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const dateStr = new Date(rep.tanggal).toLocaleDateString('id-ID').toLowerCase();
    const sourceName = (rep.sourceAccount?.nama_akun || '').toLowerCase();
    const desc = (rep.keterangan || '').toLowerCase();
    const nominalTotal = rep.nominal_total.toString();
    
    const detailsMatch = rep.details?.some((det: any) => {
      const targetName = (det.targetAccount?.nama_akun || '').toLowerCase();
      const nominalAlloc = det.nominal_alokasi.toString();
      return targetName.includes(query) || nominalAlloc.includes(query);
    });

    return dateStr.includes(query) || 
           sourceName.includes(query) || 
           desc.includes(query) || 
           nominalTotal.includes(query) ||
           detailsMatch;
  });

  // Cash Replenishment (Tarik Tunai / Pemindahan Dana Split)
  const handleAddReplenishAllocation = () => {
    setReplenishAllocations([...replenishAllocations, { targetAccountId: '', nominal: 0 }]);
  };

  const handleRemoveReplenishAllocation = (idx: number) => {
    setReplenishAllocations(replenishAllocations.filter((_, i) => i !== idx));
  };

  const handleReplenishAllocationChange = (idx: number, field: string, val: any) => {
    const updated = replenishAllocations.map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: val };
      }
      return item;
    });
    setReplenishAllocations(updated);
  };

  const handleExecuteReplenish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replenishBank) {
      alert('Mohon tentukan bank sumber penarikan.');
      return;
    }

    const filteredAlloc = replenishAllocations.filter(a => a.targetAccountId && a.nominal > 0);
    if (filteredAlloc.length === 0) {
      alert('Mohon tentukan minimal satu laci kasir penerima dengan nominal valid.');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/finance/replenish', {
        sourceBankId: replenishBank,
        allocations: filteredAlloc,
        keterangan: replenishKeterangan
      });

      alert('Pemindahan Dana berhasil dieksekusi dan dicatat di Buku Besar!');
      setReplenishBank('');
      setReplenishKeterangan('');
      setReplenishAllocations([{ targetAccountId: '', nominal: 0 }]);
      fetchAccounts(); // refresh balances
      fetchReplenishments(); // refresh history
    } catch (error: any) {
      alert('Gagal melakukan pemindahan dana: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2 no-print"
      >
        <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="hover:text-primary transition-colors cursor-pointer text-slate-400 shrink-0">Keuangan</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Pemindahan Dana</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <ArrowRightLeft className="size-8 text-primary shrink-0" />
          Pemindahan Dana
        </h2>
        <p className="text-slate-500 font-medium">
          Layanan transfer internal dari rekening bank utama untuk mengisi saldo laci kasir harian BAZNAS Kota Semarang.
        </p>
      </motion.div>

      {/* Premium Split Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column - Form */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-7 bg-white p-6 md:p-8 rounded-xl border border-primary/10 shadow-sm space-y-6"
        >
          <div>
            <h3 className="text-lg font-black text-slate-900">Alokasi Transfer Bank ke Laci Kasir</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Wewenang kasir memindahkan dana dari Bank penyimpanan utama ke pecahan laci tunai kasir harian (Kas A s.d G - Debit).
            </p>
          </div>

          <form onSubmit={handleExecuteReplenish} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Rekening Bank Sumber (Kredit)</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSourceBankDropdownOpen(!isSourceBankDropdownOpen)}
                  className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-800 text-left cursor-pointer"
                >
                  <span className="truncate">
                    {accounts.find(a => a.account_id === replenishBank) 
                      ? `${accounts.find(a => a.account_id === replenishBank).nama_akun} - (Saldo: ${formatCurrency(Number(accounts.find(a => a.account_id === replenishBank).saldo))})`
                      : '-- Pilih Bank Sumber --'
                    }
                  </span>
                  <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isSourceBankDropdownOpen && "rotate-180")} />
                </button>

                {isSourceBankDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsSourceBankDropdownOpen(false)} />
                    <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-72 overflow-y-auto custom-scrollbar">
                      <button
                        type="button"
                        onClick={() => {
                          setReplenishBank('');
                          setIsSourceBankDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                          !replenishBank ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                        )}
                      >
                        <span>-- Pilih Bank Sumber --</span>
                        {!replenishBank && <Check className="size-4 text-primary shrink-0" />}
                      </button>
                      {accounts.filter(a => a.tipe_kas === 'BANK').map(a => (
                        <button
                          key={a.account_id}
                          type="button"
                          onClick={() => {
                            setReplenishBank(a.account_id);
                            setIsSourceBankDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                            replenishBank === a.account_id ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                          )}
                        >
                          <span className="font-bold">{a.nama_akun}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-900 font-mono font-bold">{formatCurrency(Number(a.saldo))}</span>
                            {replenishBank === a.account_id && <Check className="size-4 text-primary shrink-0" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Alokasi Laci Kasir Penerima (Debit)</label>
                <button
                  type="button"
                  onClick={handleAddReplenishAllocation}
                  className="text-xs text-primary font-black flex items-center gap-1.5 uppercase hover:underline"
                >
                  <Plus className="size-3.5" /> Tambah Alokasi
                </button>
              </div>

              {replenishAllocations.map((alloc, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center p-4 sm:p-0 bg-slate-50 sm:bg-transparent rounded-2xl border border-slate-100 sm:border-none">
                  <div className="flex-1 relative">
                    <button
                      type="button"
                      onClick={() => setOpenTargetDropdownIdx(openTargetDropdownIdx === idx ? null : idx)}
                      className="w-full flex items-center justify-between text-xs bg-white sm:bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-800 text-left cursor-pointer"
                    >
                      <span className="truncate">
                        {accounts.find(a => a.account_id === alloc.targetAccountId)
                          ? `${accounts.find(a => a.account_id === alloc.targetAccountId).nama_akun} - (Saldo: ${formatCurrency(Number(accounts.find(a => a.account_id === alloc.targetAccountId).saldo))})`
                          : '-- Pilih Laci Kas --'
                        }
                      </span>
                      <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", openTargetDropdownIdx === idx && "rotate-180")} />
                    </button>

                    {openTargetDropdownIdx === idx && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setOpenTargetDropdownIdx(null)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-72 overflow-y-auto custom-scrollbar">
                          <button
                            type="button"
                            onClick={() => {
                              handleReplenishAllocationChange(idx, 'targetAccountId', '');
                              setOpenTargetDropdownIdx(null);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                              !alloc.targetAccountId ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                            )}
                          >
                            <span>-- Pilih Laci Kas --</span>
                            {!alloc.targetAccountId && <Check className="size-4 text-primary shrink-0" />}
                          </button>
                          {accounts.filter(a => a.tipe_kas === 'TUNAI').map(a => (
                            <button
                              key={a.account_id}
                              type="button"
                              onClick={() => {
                                handleReplenishAllocationChange(idx, 'targetAccountId', a.account_id);
                                setOpenTargetDropdownIdx(null);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                alloc.targetAccountId === a.account_id ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                              )}
                            >
                              <span className="font-bold">{a.nama_akun}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-900 font-mono font-bold">{formatCurrency(Number(a.saldo))}</span>
                                {alloc.targetAccountId === a.account_id && <Check className="size-4 text-primary shrink-0" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Nominal alokasi..."
                      value={alloc.nominal ? Number(alloc.nominal).toLocaleString('id-ID') : ''}
                      onChange={(e) => {
                        const rawVal = e.target.value.replace(/[^0-9]/g, '');
                        handleReplenishAllocationChange(idx, 'nominal', Number(rawVal) || 0);
                      }}
                      required
                      className="flex-1 sm:w-40 bg-white sm:bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold text-right"
                    />
                    {replenishAllocations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveReplenishAllocation(idx)}
                        className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-slate-200 sm:border-none bg-white sm:bg-transparent shrink-0"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Keterangan Pemindahan Dana</label>
              <textarea
                rows={3}
                placeholder="Contoh: Pencairan dana berkala dari Bank ke Laci Kas A dan B untuk persiapan bansos..."
                value={replenishKeterangan}
                onChange={(e) => setReplenishKeterangan(e.target.value)}
                className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium resize-none"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Dana Dipindahkan</span>
              <span className="text-lg font-black text-slate-900">
                {formatCurrency(replenishAllocations.reduce((sum, item) => sum + Number(item.nominal || 0), 0))}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Memproses...' : 'PROSES PEMINDAHAN DANA KAS'}
            </button>
          </form>
        </motion.div>

        {/* Right Column - Monitor & Ledger Guide */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-5 bg-white p-6 md:p-8 rounded-xl border border-primary/10 shadow-sm space-y-6"
        >
          {/* Monitor Saldo Terkini */}
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-wider">
                Monitor Saldo Terkini
              </span>
              <h4 className="text-sm font-black text-slate-900 mt-1.5 uppercase tracking-wider">Keadaan Saldo Kas &amp; Bank</h4>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rekening Bank Penyimpanan (Kredit)</p>
                <div className="space-y-1.5">
                  {accounts.filter(a => a.tipe_kas === 'BANK').length === 0 ? (
                    <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-primary/5">Belum ada rekening bank terdaftar</div>
                  ) : (
                    accounts.filter(a => a.tipe_kas === 'BANK').map(a => (
                      <div key={a.account_id} className="flex justify-between items-center bg-slate-50/50 px-3 py-2 rounded-lg text-xs border border-primary/5">
                        <span className="font-semibold text-slate-700">{a.nama_akun}</span>
                        <span className="font-mono font-bold text-slate-900">{formatCurrency(Number(a.saldo))}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Laci Kasir Operasional (Debit)</p>
                <div className="space-y-1.5">
                  {accounts.filter(a => a.tipe_kas === 'TUNAI').length === 0 ? (
                    <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-primary/5">Belum ada laci kasir terdaftar</div>
                  ) : (
                    accounts.filter(a => a.tipe_kas === 'TUNAI').map(a => (
                      <div key={a.account_id} className="flex justify-between items-center bg-slate-50/50 px-3 py-2 rounded-lg text-xs border border-primary/5">
                        <span className="font-semibold text-slate-700">{a.nama_akun}</span>
                        <span className="font-mono font-bold text-slate-900">{formatCurrency(Number(a.saldo))}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Riwayat Pemindahan Dana - Widened to span full width */}
      <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/5 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <History className="size-5 text-primary" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Riwayat Pemindahan Dana</h3>
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input
              type="text"
              placeholder="Cari riwayat pemindahan..."
              className="w-full text-xs bg-white border border-primary/10 rounded-xl pl-9 pr-4 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/20 border-b border-slate-100">
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Bank Sumber (Kredit)</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Laci Tujuan (Debit)</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Keterangan</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Total Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {filteredReplenishments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-medium">
                    Belum ada riwayat pemindahan dana.
                  </td>
                </tr>
              ) : (
                filteredReplenishments.map((rep) => (
                  <tr key={rep.mutation_id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">
                      {new Date(rep.tanggal).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {rep.sourceAccount?.nama_akun || 'Unknown Bank'}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <div className="space-y-1">
                        {rep.details?.map((det: any) => (
                          <div key={det.detail_id} className="flex items-center gap-2">
                            <span className="font-semibold">{det.targetAccount?.nama_akun}:</span>
                            <span className="font-bold text-slate-900">{formatCurrency(Number(det.nominal_alokasi))}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={rep.keterangan}>
                      {rep.keterangan || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900 whitespace-nowrap">
                      {formatCurrency(Number(rep.nominal_total))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
