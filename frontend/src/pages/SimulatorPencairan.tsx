import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  CheckCircle2, 
  FileText, 
  Banknote,
  Wallet,
  ArrowUpRight,
  ChevronRight,
  Play,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';

interface SimulatorPencairanProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function SimulatorPencairan({ data, onUpdate }: SimulatorPencairanProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [simProposalId, setSimProposalId] = useState('');
  const [simAccountId, setSimAccountId] = useState('');
  const [simKeterangan, setSimKeterangan] = useState('');
  const [simGuardResult, setSimGuardResult] = useState<any | null>(null);
  const [simPreviewResult, setSimPreviewResult] = useState<any | null>(null);
  const [simGuardLoading, setSimGuardLoading] = useState(false);
  const [simExecuting, setSimExecuting] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Fetch accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:4000/api/finance/accounts');
        setAccounts(res.data);
      } catch (e) {
        console.error('Gagal mengambil data rekening: ', e);
      }
    };
    fetchAccounts();
  }, []);

  // Filter only proposals in 'Pencairan Dana' or 'Antrean Bantuan' status
  const validProposals = useMemo(() => {
    return data.filter(p => p.status === 'Pencairan Dana' || p.status === 'Antrean Bantuan');
  }, [data]);

  const handleProposalSelect = async (proposalId: string) => {
    setSimProposalId(proposalId);
    setSimGuardResult(null);
    setSimPreviewResult(null);
    setSimAccountId('');

    if (!proposalId) return;

    setSimGuardLoading(true);
    try {
      const res = await axios.get(`http://127.0.0.1:4000/api/finance/check-availability/${proposalId}`);
      setSimGuardResult(res.data);
    } catch (e) {
      console.error('Gagal menghitung kuota double-guard:', e);
    } finally {
      setSimGuardLoading(false);
    }
  };

  const handlePaymentAccountSelect = async (accountId: string) => {
    setSimAccountId(accountId);
    setSimPreviewResult(null);

    if (!simProposalId || !accountId) return;

    try {
      const res = await axios.post('http://127.0.0.1:4000/api/finance/disburse/preview', {
        proposalId: simProposalId,
        selectedAccountId: accountId
      });
      setSimPreviewResult(res.data);
    } catch (e) {
      console.error('Gagal memuat preview entri jurnal:', e);
    }
  };

  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simProposalId || !simAccountId) {
      alert('Mohon pilih agenda proposal dan akun bayar');
      return;
    }

    setSimExecuting(true);
    try {
      const res = await axios.post('http://127.0.0.1:4000/api/finance/disburse/execute', {
        proposalId: simProposalId,
        selectedAccountId: simAccountId,
        keterangan: simKeterangan
      });

      // Update global proposals status to 'Selesai & Arsip' so it clears out of both queues
      const updatedData = data.map(item => 
        item.id === simProposalId ? { ...item, status: 'Selesai & Arsip' as any } : item
      );
      onUpdate(updatedData);

      setSuccessData({
        message: res.data.message,
        proposal: validProposals.find(p => p.id === simProposalId),
        account: accounts.find(a => a.account_id === simAccountId),
        preview: simPreviewResult
      });

      // Reset
      setSimProposalId('');
      setSimAccountId('');
      setSimKeterangan('');
      setSimGuardResult(null);
      setSimPreviewResult(null);

      // Refresh accounts balance
      const resAcc = await axios.get('http://127.0.0.1:4000/api/finance/accounts');
      setAccounts(resAcc.data);
    } catch (error: any) {
      alert('Pencairan Gagal: ' + (error.response?.data?.error || error.message));
    } finally {
      setSimExecuting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Title Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
          <span className="hover:text-primary transition-colors cursor-pointer">Keuangan</span>
          <ChevronRight className="size-3.5 text-slate-300" />
          <span className="text-primary font-black">Simulator Pencairan</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          Simulator Eksekusi &amp; Jurnal
        </h2>
        <p className="text-slate-500 font-medium">
          Gunakan simulator ini untuk memvalidasi pagu anggaran RKAT dan saldo kas riil, serta melihat preview pencatatan double-entry secara otomatis.
        </p>
      </motion.div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Card: Input Selection Form */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 col-span-1"
        >
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              FORM SIMULASI
            </h3>
          </div>

          <form onSubmit={handleExecutePayment} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                1. Pilih Agenda Proposal ({validProposals.length} Antrean)
              </label>
              <select
                value={simProposalId}
                onChange={(e) => handleProposalSelect(e.target.value)}
                required
                className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3.5 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-800 transition-all"
              >
                <option value="">-- Pilih Agenda --</option>
                {validProposals.map(p => (
                  <option key={p.id} value={p.id}>
                    PR-{p.agendaNo} - {p.namaPemohon} ({formatCurrency(p.nominal || 0)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                2. Pilih Rekening / Laci Pembayar
              </label>
              <select
                value={simAccountId}
                onChange={(e) => handlePaymentAccountSelect(e.target.value)}
                required
                disabled={!simProposalId}
                className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3.5 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-800 disabled:opacity-50 transition-all"
              >
                <option value="">-- Pilih Rekening Bayar --</option>
                {accounts.map(a => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.nama_akun} - ({formatCurrency(Number(a.saldo))})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                3. Keterangan Pencairan
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Pencairan bantuan biaya hidup mustahik tunai melalui laci kasir..."
                value={simKeterangan}
                onChange={(e) => setSimKeterangan(e.target.value)}
                className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3.5 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-medium resize-none text-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={simExecuting || !simProposalId || !simAccountId}
              className="w-full py-4 bg-primary text-white rounded-xl text-xs font-black tracking-wider uppercase shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
            >
              {simExecuting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              Eksekusi Pembayaran & Jurnal
            </button>
          </form>
        </motion.div>

        {/* Right Card: Double-Guard Checks & Jurnal Entry Preview */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Double-Guard Checking */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              Informasi RKAT &amp; Kas (Double-Guard Verification)
            </h4>

            {simGuardLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs font-bold animate-pulse flex flex-col items-center justify-center gap-2">
                <RotateCcw className="size-5 animate-spin text-primary" />
                Menghitung pagu anggaran &amp; saldo riil...
              </div>
            ) : simGuardResult ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* RKAT Guard */}
                <div className={cn(
                  "p-4 rounded-2xl border transition-all",
                  simGuardResult.rkat.status === 'CUKUP' ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" : "bg-rose-50/50 border-rose-100 text-rose-800"
                )}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Anggaran RKAT Terkait (Plafon)</p>
                  <p className="text-xl font-black mt-1 text-slate-900">{formatCurrency(simGuardResult.rkat.sisa_pagu)}</p>
                  <span className={cn(
                    "inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase mt-2",
                    simGuardResult.rkat.status === 'CUKUP' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  )}>
                    PAGU: {simGuardResult.rkat.status}
                  </span>
                </div>

                {/* Cash Liquidity Guard */}
                <div className={cn(
                  "p-4 rounded-2xl border transition-all",
                  simGuardResult.kas_riil.status === 'AMAN' ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" : "bg-rose-50/50 border-rose-100 text-rose-800"
                )}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Saldo Kas Tersedia ({simGuardResult.sumber_dana_yang_dipakai})</p>
                  <p className="text-xl font-black mt-1 text-slate-900">{formatCurrency(simGuardResult.kas_riil.total_tersedia)}</p>
                  <span className={cn(
                    "inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase mt-2",
                    simGuardResult.kas_riil.status === 'AMAN' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  )}>
                    KAS: {simGuardResult.kas_riil.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold italic">
                Silakan pilih agenda proposal terlebih dahulu untuk melihat kelayakan kas &amp; pagu.
              </div>
            )}
          </div>

          {/* Journal Entry Preview */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              Preview Entri Jurnal Otomatis (Buku Besar)
            </h4>

            {simPreviewResult ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px] tracking-wider">
                        <th className="py-2.5">Kode Akun</th>
                        <th className="py-2.5">Nama Akun Buku Besar</th>
                        <th className="py-2.5 text-right">Debit (Rp)</th>
                        <th className="py-2.5 text-right">Kredit (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      <tr>
                        <td className="py-3 text-emerald-450">{simPreviewResult.debit.coa_code}</td>
                        <td className="py-3 text-slate-200">{simPreviewResult.debit.nama_akun}</td>
                        <td className="py-3 text-right text-emerald-450">{formatCurrency(simPreviewResult.nominal)}</td>
                        <td className="py-3 text-right text-slate-500">-</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-blue-400">{simPreviewResult.kredit.coa_code}</td>
                        <td className="py-3 text-slate-200">{simPreviewResult.kredit.nama_akun}</td>
                        <td className="py-3 text-right text-slate-500">-</td>
                        <td className="py-3 text-right text-blue-400">{formatCurrency(simPreviewResult.nominal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-xs font-bold text-slate-400">
                  <span>Status Jurnal:</span>
                  <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 uppercase tracking-widest font-black text-[9px]">
                    Balanced / Seimbang ✅
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs font-semibold italic">
                Silakan pilih agenda proposal dan akun bayar untuk melihat preview jurnal pembukuan.
              </div>
            )}
          </div>

        </motion.div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {successData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSuccessData(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-6 border border-primary/10"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="size-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <CheckCircle2 className="size-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Pencairan Berhasil!</h3>
                <p className="text-xs text-slate-500 font-medium px-4">
                  {successData.message} Agenda proposal telah divalidasi dan dicatat ke dalam buku besar akuntansi.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-100 text-xs">
                <div className="flex justify-between font-bold text-slate-700">
                  <span className="text-slate-400">Mustahik:</span>
                  <span>{successData.proposal?.namaPemohon}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span className="text-slate-400">No. Agenda:</span>
                  <span>PR-{successData.proposal?.agendaNo}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span className="text-slate-400">Sumber Kas:</span>
                  <span>{successData.account?.nama_akun}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 border-t border-slate-200 pt-2 text-sm">
                  <span className="text-slate-500">Nominal:</span>
                  <span className="text-emerald-600">{formatCurrency(successData.proposal?.nominal || 0)}</span>
                </div>
              </div>

              <button 
                onClick={() => setSuccessData(null)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Selesai
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
