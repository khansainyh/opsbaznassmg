import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Search, 
  ChevronRight, 
  Eye, 
  X, 
  ClipboardList, 
  Banknote,
  ArrowUpRight,
  Coins,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';

interface AntreanPencairanProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function AntreanPencairan({ data }: AntreanPencairanProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);

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

  // Filter only proposals with 'Pencairan Dana' or 'Antrean Bantuan' status
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const isPencairan = item.status === 'Pencairan Dana' || item.status === 'Antrean Bantuan';
      const searchMatch = item.agendaNo.toString().includes(searchTerm) || 
                         item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.namaInstansi?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (item.nik || '').includes(searchTerm);
      return isPencairan && searchMatch;
    });
  }, [data, searchTerm]);

  const stats = useMemo(() => {
    const pencairanData = data.filter(d => d.status === 'Pencairan Dana' || d.status === 'Antrean Bantuan');
    const totalNominal = pencairanData.reduce((acc, curr) => acc + (curr.nominal || 0), 0);
    
    // Accumulate cash balance for Zakat, ISTT, IST
    const kasTersedia = accounts
      .filter(a => 
        a.tipe_kas === 'TUNAI' && (
          a.kelompok_dana === 'ZAKAT' || 
          a.kelompok_dana === 'INFAK_TIDAK_TERIKAT' || 
          a.kelompok_dana === 'INFAK_TERIKAT'
        )
      )
      .reduce((sum, item) => sum + Number(item.saldo), 0);
    
    return {
      total: pencairanData.length,
      totalNominal,
      kasTersedia,
      rekomendasiKas: Math.max(0, totalNominal - kasTersedia)
    };
  }, [data, accounts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Breadcrumbs & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
          <span className="hover:text-primary transition-colors cursor-pointer">Keuangan</span>
          <ChevronRight className="size-3.5 text-slate-300" />
          <span className="text-primary font-black">Antrean Pencairan</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Antrean Pencairan Dana
        </h2>
        <p className="text-slate-500 font-medium">
          Daftar bantuan yang menunggu proses pencairan dana oleh bagian keuangan.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Antrean Pencairan" 
          value={formatCurrency(stats.totalNominal)} 
          icon={<Banknote className="size-5" />}
          color="amber"
          subtitle={`Akumulasi ${stats.total} bantuan`}
        />
        <StatCard 
          title="Kas Tersedia (Pencairan)" 
          value={formatCurrency(stats.kasTersedia)} 
          icon={<ArrowUpRight className="size-5" />}
          color="blue"
          subtitle="Akumulasi Kas Zakat, ISTT, & IST"
        />
        <StatCard 
          title="Rekomendasi Penarikan Kas" 
          value={formatCurrency(stats.rekomendasiKas)} 
          icon={<Coins className="size-5" />}
          color="emerald"
          subtitle={stats.rekomendasiKas > 0 ? "Kekurangan dana tunai" : "Kas tunai mencukupi"}
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                placeholder="Cari No. Agenda / Nama..."
                className="w-full text-sm bg-slate-50 border-slate-200 rounded-lg pl-10 py-2 focus:ring-primary focus:border-primary outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4">No. Agenda</th>
                <th className="px-6 py-4">Mustahik</th>
                <th className="px-6 py-4">Program & Jenis</th>
                <th className="px-6 py-4">Nominal</th>
                <th className="px-6 py-4">Tipe</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                      {item.agendaNo}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-bold text-slate-900">{item.namaPemohon}</p>
                      <p className="text-[10px] text-slate-400 font-medium tracking-wider">{item.nik}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="px-2 py-1 rounded text-[10px] font-black uppercase w-fit bg-primary/5 text-primary border border-primary/10">
                        {item.program || 'Umum'}
                      </span>
                      <p className="text-xs text-slate-500 font-medium truncate max-w-[150px]">
                        {item.jenisPermohonan}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-slate-900">{formatCurrency(item.nominal || 0)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold border",
                      item.tipeBantuan === 'Tunai' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      item.tipeBantuan === 'Barang' ? "bg-blue-50 text-blue-600 border-blue-100" :
                      "bg-slate-50 text-slate-400 border-slate-200"
                    )}>
                      {item.tipeBantuan || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      <button 
                        onClick={() => {
                          setSelectedProposal(item);
                          setIsDetailModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                        title="Detail"
                      >
                        <Eye className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="size-12 opacity-10" />
                      <p className="text-sm font-medium">Tidak ada antrean pencairan saat ini.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedProposal && (
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
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Detail Pencairan</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">No. Agenda: {selectedProposal.agendaNo}</p>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Data Pemohon</h4>
                      <div className="space-y-4">
                        <DetailItem label="Nama Lengkap" value={selectedProposal.namaPemohon} />
                        <DetailItem label="NIK" value={selectedProposal.nik} />
                        <DetailItem label="Alamat" value={selectedProposal.alamat} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Informasi Bantuan</h4>
                      <div className="space-y-4">
                        <DetailItem label="Program" value={selectedProposal.program || 'Umum'} />
                        <DetailItem label="Jenis" value={selectedProposal.jenisPermohonan} />
                        <DetailItem label="Tipe" value={selectedProposal.tipeBantuan || '-'} />
                        <DetailItem label="Asnaf (Golongan Penerima)" value={selectedProposal.asnaf || '—'} />
                        
                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Rekomendasi Kas (Kabag Pendistribusian)</p>
                          <p className="text-sm font-bold text-slate-900">{selectedProposal.rekomendasi_kabag || 'Zakat'}</p>
                        </div>

                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Nominal Pencairan</p>
                          <p className="text-xl font-black text-slate-900">{formatCurrency(selectedProposal.nominal || 0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all text-center"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-900 leading-relaxed">{value}</p>
    </div>
  );
}

function StatCard({ title, value, icon, color, subtitle }: { 
  title: string, 
  value: string, 
  icon: React.ReactNode,
  color: 'primary' | 'emerald' | 'amber' | 'red' | 'blue',
  subtitle?: string
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-500',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600'
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm relative overflow-hidden group">
      <div className="absolute -right-4 -bottom-4 size-24 bg-primary/5 rounded-full group-hover:scale-110 transition-transform" />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
        {subtitle && (
          <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
            <Info className="size-3" />
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
