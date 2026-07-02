import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  HelpCircle,
  AlertCircle,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

export default function PengajuanOperasional() {
  const { user } = useAuth();
  
  // List states
  const [pengajuans, setPengajuans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Form states
  const [kategoriBiaya, setKategoriBiaya] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [nominal, setNominal] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  // Modal / Detail state
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const fetchMyPengajuans = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const res = await axios.get(`/api/pengajuan-pencairan?userId=${user.id}&tab=my-requests`);
      if (res.data.status === 'success') {
        setPengajuans(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch my pengajuans:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get('/api/kategori-biaya');
      if (res.data.status === 'success') {
        setCategories(res.data.data);
        if (res.data.data.length > 0) {
          setKategoriBiaya(res.data.data[0].nama);
        }
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  useEffect(() => {
    fetchMyPengajuans();
    fetchCategories();
  }, [fetchMyPengajuans, fetchCategories]);

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    setNominal(rawVal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nominal || Number(nominal) <= 0 || !keterangan) {
      alert('Mohon isi nominal valid dan keterangan pengajuan.');
      return;
    }

    try {
      setIsSubmitLoading(true);
      const res = await axios.post('/api/pengajuan-pencairan', {
        pengaju_id: user?.id,
        kategori_biaya: kategoriBiaya,
        keterangan: keterangan,
        nominal: Number(nominal),
        rkat_id: null
      });

      if (res.data.status === 'success') {
        alert('Pengajuan pencairan berhasil disubmit ke alur persetujuan.');
        setKeterangan('');
        setNominal('');
        fetchMyPengajuans();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Gagal mengirim pengajuan.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus/membatalkan pengajuan pencairan ini?')) {
      return;
    }

    try {
      const res = await axios.delete(`/api/pengajuan-pencairan/${id}?userId=${user?.id}`);
      if (res.data.status === 'success') {
        alert('Pengajuan pencairan berhasil dihapus.');
        fetchMyPengajuans();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Gagal menghapus pengajuan.');
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-bold">DRAFT</span>;
      case 'WAITING_KABID':
        return <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"><Clock className="size-3" /> Waiting Kabid</span>;
      case 'WAITING_KAPEL':
        return <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"><Clock className="size-3" /> Waiting Kapel</span>;
      case 'WAITING_WAKA3':
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"><Clock className="size-3" /> Waiting Waka III</span>;
      case 'WAITING_KETUA':
        return <span className="bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"><Clock className="size-3" /> Waiting Ketua</span>;
      case 'WAITING_FINANCE_APP':
        return <span className="bg-yellow-50 text-yellow-700 border border-yellow-100 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"><Clock className="size-3" /> Waiting Kabag Keu</span>;
      case 'APPROVED':
        return <span className="bg-teal-50 text-teal-700 border border-teal-100 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"><CheckCircle2 className="size-3" /> Antrean Bayar</span>;
      case 'CAIR':
        return <span className="bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"><CheckCircle2 className="size-3" /> Realisasi Cair</span>;
      case 'DITOLAK':
        return <span className="bg-red-50 text-red-700 border border-red-100 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"><XCircle className="size-3" /> Ditolak</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-slate-100 pb-5 no-print"
      >
        <div className="space-y-1">
          <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
            <span className="hover:text-primary transition-colors cursor-pointer">Operasional</span>
            <ChevronRight className="size-3.5 text-slate-300" />
            <span className="text-primary font-black">Pengajuan Operasional</span>
          </nav>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <FileText className="size-8 text-primary shrink-0" />
            Pengajuan Operasional
          </h2>
          <p className="text-slate-500 font-medium text-xs md:text-sm">
            Ajukan pencairan dana operasional/rutin kantor non-proposal bantuan BAZNAS Kota Semarang.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-800 border-b pb-3">Form Pengajuan</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Kategori */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Kategori Biaya</label>
              <select
                value={kategoriBiaya}
                onChange={(e) => setKategoriBiaya(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.nama}>{cat.nama}</option>
                ))}
              </select>
            </div>

             {/* Nominal */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Nominal Pengajuan (Rp)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  value={nominal ? parseInt(nominal).toLocaleString('id-ID') : ''}
                  onChange={handleNominalChange}
                  placeholder="Contoh: 750.000"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            {/* Keterangan */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Detail Keperluan & Keterangan</label>
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Tulis alasan, item yang dibeli, atau keperluan pengajuan secara detail..."
                rows={4}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitLoading}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all"
            >
              <Plus className="size-4" /> {isSubmitLoading ? 'Mengirim...' : 'Submit Pengajuan'}
            </button>
          </form>
        </div>

        {/* Right Side: List History */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[500px] space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b pb-3">Riwayat Pengajuan Saya</h2>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">Loading data...</div>
          ) : pengajuans.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10 space-y-2">
              <HelpCircle className="size-10 text-slate-300" />
              <p className="text-xs font-medium">Belum ada pengajuan pencairan operasional yang dibuat.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-2">No Pengajuan</th>
                    <th className="py-3 px-2">Tanggal</th>
                    <th className="py-3 px-2">Kategori</th>
                    <th className="py-3 px-2 text-right">Nominal</th>
                    <th className="py-3 px-2 text-center">Status</th>
                    <th className="py-3 px-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-600">
                  {pengajuans.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-2 font-mono text-xs">{p.no_pengajuan}</td>
                      <td className="py-3 px-2 text-xs font-medium">{new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
                      <td className="py-3 px-2 text-xs">
                        <span className="font-semibold">{p.kategori_biaya}</span>
                        {p.rkat && <p className="text-[10px] text-slate-400 font-mono">({p.rkat.no})</p>}
                      </td>
                      <td className="py-3 px-2 text-right text-xs font-black text-slate-800">{formatRupiah(Number(p.nominal))}</td>
                      <td className="py-3 px-2 text-center">{getStatusBadge(p.status)}</td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedItem(p)}
                            className="p-1.5 hover:bg-slate-100 text-primary rounded-lg transition-all"
                            title="Lihat Detail & Logs"
                          >
                            <Eye className="size-4" />
                          </button>
                          {p.status !== 'CAIR' && (
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-all"
                              title="Hapus Pengajuan"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-base">Detail Pengajuan Pencairan</h3>
                <p className="font-mono text-xs text-slate-400 mt-0.5">{selectedItem.no_pengajuan}</p>
              </div>
              <button 
                onClick={() => setSelectedItem(null)} 
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Kategori Biaya</p>
                  <p className="font-bold text-slate-700 mt-0.5">{selectedItem.kategori_biaya}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nominal</p>
                  <p className="font-black text-primary mt-0.5 text-base">{formatRupiah(Number(selectedItem.nominal))}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Link RKAT</p>
                  <p className="font-semibold text-slate-600 mt-0.5 text-xs">
                    {selectedItem.rkat ? `(${selectedItem.rkat.no}) ${selectedItem.rkat.nama}` : 'Tidak di-link ke RKAT'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Keterangan Keperluan</p>
                  <p className="font-medium text-slate-600 mt-0.5 whitespace-pre-wrap">{selectedItem.keterangan}</p>
                </div>
                {selectedItem.status === 'DITOLAK' && selectedItem.alasan_penolakan && (
                  <div className="col-span-2 bg-red-50 border border-red-100 p-3 rounded-lg flex gap-2 text-red-700">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">Alasan Penolakan</p>
                      <p className="text-xs font-semibold mt-0.5">{selectedItem.alasan_penolakan}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Logs / Audit Trail */}
              <div>
                <h4 className="font-bold text-slate-800 mb-3 block">Riwayat Log Persetujuan</h4>
                <div className="space-y-4 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {selectedItem.logs?.map((log: any) => (
                    <div key={log.id} className="relative">
                      <span className="absolute -left-5 top-1.5 size-2.5 rounded-full bg-slate-400 border border-white"></span>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-700">{log.actor?.name} · <span className="uppercase text-[9px] text-slate-400 font-black">{log.actor?.role.replace(/_/g, ' ')}</span></p>
                          <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleString('id-ID')}</span>
                        </div>
                        <p className="text-[10px] font-black text-primary uppercase mt-1">Action: {log.action}</p>
                        {log.catatan && <p className="mt-1 text-slate-500 font-medium italic">"{log.catatan}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
