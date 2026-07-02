import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  HelpCircle,
  ArrowRightLeft,
  ChevronDown,
  Check,
  ChevronRight
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

  // Form states - Replenishment
  const [replenishBank, setReplenishBank] = useState('');
  const [replenishKeterangan, setReplenishKeterangan] = useState('');
  const [replenishAllocations, setReplenishAllocations] = useState<Array<{ targetAccountId: string, nominal: number }>>([
    { targetAccountId: '', nominal: 0 }
  ]);
  const [isSourceBankDropdownOpen, setIsSourceBankDropdownOpen] = useState(false);
  const [openTargetDropdownIdx, setOpenTargetDropdownIdx] = useState<number | null>(null);

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
  }, []);

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
    } catch (error: any) {
      alert('Gagal melakukan pemindahan dana: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-slate-100 pb-5 no-print"
      >
        <div className="space-y-1">
          <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
            <span className="hover:text-primary transition-colors cursor-pointer">Keuangan</span>
            <ChevronRight className="size-3.5 text-slate-300" />
            <span className="text-primary font-black">Pemindahan Dana</span>
          </nav>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <ArrowRightLeft className="size-8 text-primary shrink-0" />
            Pemindahan Dana
          </h2>
          <p className="text-slate-500 font-medium text-xs md:text-sm">
            Layanan transfer internal dari Rekening Bank utama untuk mengisi (top-up) Laci Kasir operasional harian BAZNAS Kota Semarang.
          </p>
        </div>
      </motion.div>

      {/* Centered Premium Container */}
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Split Replenishment form */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6"
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
                <div key={idx} className="flex gap-3 items-center">
                  <div className="flex-1 relative">
                    <button
                      type="button"
                      onClick={() => setOpenTargetDropdownIdx(openTargetDropdownIdx === idx ? null : idx)}
                      className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-800 text-left cursor-pointer"
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
                  <input
                    type="text"
                    placeholder="Nominal alokasi..."
                    value={alloc.nominal ? Number(alloc.nominal).toLocaleString('id-ID') : ''}
                    onChange={(e) => {
                      const rawVal = e.target.value.replace(/[^0-9]/g, '');
                      handleReplenishAllocationChange(idx, 'nominal', Number(rawVal) || 0);
                    }}
                    required
                    className="w-40 bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold text-right"
                  />
                  {replenishAllocations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveReplenishAllocation(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
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

        {/* Replenishment Ledger Guide - Moved to bottom and styled horizontally */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 text-slate-200 p-8 rounded-3xl border border-slate-800 shadow-md space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
            <div className="space-y-1">
              <span className="px-2.5 py-1 bg-primary/20 text-primary border border-primary/30 rounded-lg text-[9px] font-black uppercase tracking-wider">
                Logika Akuntansi Buku Besar
              </span>
              <h4 className="text-lg font-black text-white mt-1.5">Skema Double-Entry Pemindahan Dana</h4>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                Sistem akan memotong saldo bank riil (Kredit) sekaligus memindahkan saldo fisik ke masing-masing laci kasir (Debit) secara transaksional aman dan akurat.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-slate-850 px-4 py-2.5 rounded-2xl border border-slate-800 shrink-0 self-start md:self-center">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span className="text-xs font-black text-slate-200">Balanced (Buku Besar Seimbang)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-4 items-start bg-slate-950/40 p-5 rounded-2xl border border-slate-800/60">
              <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black shrink-0 text-sm">D</div>
              <div className="space-y-1">
                <p className="text-xs font-black text-white uppercase tracking-wider">Entri Debit (Penambahan Aset Kas Fisik)</p>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Mendebit COA Kas Tunai (misal 111010101) dari masing-masing laci kasir penerima sesuai nominal alokasi split.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-slate-950/40 p-5 rounded-2xl border border-slate-800/60">
              <div className="size-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-black shrink-0 text-sm">K</div>
              <div className="space-y-1">
                <p className="text-xs font-black text-white uppercase tracking-wider">Entri Kredit (Pengurangan Aset Bank Sumber)</p>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Mengkredit COA Bank (misal 111010201) milik Rekening Bank sumber sebesar akumulasi total penarikan.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-850/30 p-4 rounded-2xl border border-slate-800/60 flex items-center gap-4">
            <HelpCircle className="size-6 text-primary shrink-0" />
            <p className="text-[11px] text-slate-400 leading-normal font-medium">
              Transaksi pemindahan dana ini didaftarkan sebagai mutasi kas internal dan dicatat langsung ke dalam buku besar akuntansi BAZNAS Kota Semarang.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
