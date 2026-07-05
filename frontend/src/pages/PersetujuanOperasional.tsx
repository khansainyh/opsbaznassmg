import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle2,
  XCircle,
  X, 
  HelpCircle,
  Eye,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

export default function PersetujuanOperasional() {
  const { user } = useAuth();
  
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Approve / Reject modal state
  const [selectedActionItem, setSelectedActionItem] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'detail' | null>(null);
  const [catatan, setCatatan] = useState('');
  const [alasanPenolakan, setAlasanPenolakan] = useState('');
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  const fetchPendingRequests = useCallback(async () => {
    if (!user?.role) return;
    try {
      setIsLoading(true);
      const res = await axios.get(`/api/pengajuan-pencairan?role=${user.role}&tab=pending`);
      if (res.data.status === 'success') {
        setPendingList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const handleApprove = async () => {
    if (!selectedActionItem) return;
    try {
      setIsSubmitLoading(true);
      const res = await axios.post(`/api/pengajuan-pencairan/${selectedActionItem.id}/approve`, {
        actorId: user?.id,
        catatan: catatan || 'Menyetujui pengajuan operasional.'
      });

      if (res.data.status === 'success') {
        alert('Pengajuan berhasil disetujui!');
        closeModal();
        fetchPendingRequests();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Gagal menyetujui pengajuan.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedActionItem) return;
    if (!alasanPenolakan.trim()) {
      alert('Alasan penolakan wajib diisi.');
      return;
    }
    try {
      setIsSubmitLoading(true);
      const res = await axios.post(`/api/pengajuan-pencairan/${selectedActionItem.id}/reject`, {
        actorId: user?.id,
        alasan_penolakan: alasanPenolakan
      });

      if (res.data.status === 'success') {
        alert('Pengajuan berhasil ditolak.');
        closeModal();
        fetchPendingRequests();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Gagal menolak pengajuan.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedActionItem(null);
    setActionType(null);
    setCatatan('');
    setAlasanPenolakan('');
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const cleanRoleName = (role: string) => {
    return role.replace(/_/g, ' ');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2 no-print"
      >
        <nav className="flex text-sm gap-2 items-center">
          <span className="text-slate-400">Operasional</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Persetujuan Operasional</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Persetujuan Operasional
        </h2>
        <p className="text-slate-500 font-medium">
          Halaman khusus pimpinan/verifikator untuk meninjau dan menyetujui anggaran operasional.
        </p>
      </motion.div>

      {/* Pending List Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[500px] space-y-4">
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <h2 className="text-base font-bold text-slate-800">Antrean Persetujuan Anda ({pendingList.length})</h2>
          <span className="bg-primary/10 text-primary text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
            Role: {user?.role ? cleanRoleName(user.role) : ''}
          </span>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">Loading data...</div>
        ) : pendingList.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10 space-y-2">
            <HelpCircle className="size-10 text-slate-300" />
            <p className="text-xs font-medium">Tidak ada pengajuan pending yang memerlukan persetujuan Anda saat ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-2">No Pengajuan</th>
                  <th className="py-3 px-2">Pengaju</th>
                  <th className="py-3 px-2">Keperluan & Kategori</th>
                  <th className="py-3 px-2 text-right">Nominal</th>
                  <th className="py-3 px-2 text-center">Status</th>
                  <th className="py-3 px-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-600">
                {pendingList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2 font-mono text-xs">{item.no_pengajuan}</td>
                    <td className="py-3 px-2 text-xs">
                      <p className="font-bold text-slate-800">{item.pengaju?.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{cleanRoleName(item.pengaju?.role || '')}</p>
                    </td>
                    <td className="py-3 px-2 text-xs">
                      <p className="font-semibold text-slate-700 truncate max-w-xs">{item.keterangan}</p>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono mt-1 inline-block">
                        {item.kategori_biaya}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-xs font-black text-primary">{formatRupiah(Number(item.nominal))}</td>
                    <td className="py-3 px-2 text-center text-xs">
                      <span className="bg-yellow-50 text-yellow-700 border border-yellow-100 px-2 py-0.5 rounded-full font-bold">
                        Pending
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedActionItem(item);
                            setActionType('approve');
                          }}
                          className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Setujui"
                        >
                          <CheckCircle2 className="size-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedActionItem(item);
                            setActionType('reject');
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          title="Tolak"
                        >
                          <XCircle className="size-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedActionItem(item);
                            setActionType('detail');
                          }}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          title="Lihat Detail / Riwayat"
                        >
                          <Eye className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Actions */}
      {selectedActionItem && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-base">
                  {actionType === 'approve' && 'Persetujuan Pengajuan'}
                  {actionType === 'reject' && 'Penolakan Pengajuan'}
                  {actionType === 'detail' && 'Detail & Riwayat Log'}
                </h3>
                <p className="font-mono text-xs text-slate-400 mt-0.5">{selectedActionItem.no_pengajuan}</p>
              </div>
              <button 
                onClick={closeModal} 
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-sm overflow-y-auto max-h-[70vh] custom-scrollbar">
              {/* Summary Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Pengaju</span>
                  <span className="font-bold text-slate-700">{selectedActionItem.pengaju?.name} ({cleanRoleName(selectedActionItem.pengaju?.role || '')})</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Kategori</span>
                  <span className="font-bold text-slate-700">{selectedActionItem.kategori_biaya}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Nominal</span>
                  <span className="font-black text-primary text-sm">{formatRupiah(Number(selectedActionItem.nominal))}</span>
                </div>
                <div className="border-t border-slate-200/60 pt-2 text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Keperluan</span>
                  <p className="font-medium text-slate-600 italic">"{selectedActionItem.keterangan}"</p>
                </div>
              </div>

              {/* Action Form */}
              {actionType === 'approve' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Catatan / Memo Persetujuan (Opsional)</label>
                  <textarea
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Tulis catatan persetujuan jika ada..."
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={closeModal} className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-xl font-bold text-xs">Batal</button>
                    <button 
                      onClick={handleApprove} 
                      disabled={isSubmitLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs disabled:opacity-50"
                    >
                      {isSubmitLoading ? 'Proses...' : 'Setujui Pengajuan'}
                    </button>
                  </div>
                </div>
              )}

              {actionType === 'reject' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Alasan Penolakan (Wajib)</label>
                  <textarea
                    value={alasanPenolakan}
                    onChange={(e) => setAlasanPenolakan(e.target.value)}
                    placeholder="Tulis alasan mengapa pengajuan operasional ini ditolak..."
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={closeModal} className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-xl font-bold text-xs">Batal</button>
                    <button 
                      onClick={handleReject} 
                      disabled={isSubmitLoading}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs disabled:opacity-50"
                    >
                      {isSubmitLoading ? 'Proses...' : 'Tolak Pengajuan'}
                    </button>
                  </div>
                </div>
              )}

              {actionType === 'detail' && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-slate-800 text-xs">Riwayat Log Persetujuan</h4>
                  <div className="space-y-3 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {selectedActionItem.logs?.map((log: any) => (
                      <div key={log.id} className="relative">
                        <span className="absolute -left-5 top-1 size-2 rounded-full bg-slate-400 border border-white"></span>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px]">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-700">{log.actor?.name} · <span className="uppercase text-[8px] text-slate-400 font-black">{cleanRoleName(log.actor?.role || '')}</span></p>
                            <span className="text-[9px] text-slate-400">{new Date(log.created_at).toLocaleString('id-ID')}</span>
                          </div>
                          <p className="text-[9px] font-black text-primary uppercase mt-0.5">Action: {log.action}</p>
                          {log.catatan && <p className="mt-0.5 text-slate-500 font-medium italic">"{log.catatan}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
