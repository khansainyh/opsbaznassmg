import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, 
  ChevronRight, 
  Eye, 
  FileText, 
  X, 
  ClipboardList, 
  AlertTriangle, 
  Banknote,
  UserCheck,
  Info,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';
import { Pilar } from '../data/pilarData';

interface PenentuanNominalProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function PenentuanNominal({ data, onUpdate }: PenentuanNominalProps) {
  const [pilars, setPilars] = useState<Pilar[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [nominalInputs, setNominalInputs] = useState<Record<string, string>>({});
  const [alasanInputs, setAlasanInputs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    axios.get('http://127.0.0.1:4000/api/pilars')
      .then(res => setPilars(res.data))
      .catch(console.error);
  }, []);

  const getRKATBudget = (jenisPermohonan: string): number | undefined => {
    for (const pilar of pilars) {
      for (const prog of pilar.programs) {
        if (prog.name === jenisPermohonan && typeof prog.budget_rkat === 'number') {
          return prog.budget_rkat;
        }
      }
    }
    return undefined;
  };

  // Filter only proposals with 'Penentuan Nominal' status and no nominal set
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const isPenentuanNominal = item.status === 'Penentuan Nominal' && !item.nominal;
      const searchMatch = item.agendaNo.toString().includes(searchTerm) || 
                         item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.namaInstansi?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (item.nik || '').includes(searchTerm);
      return isPenentuanNominal && searchMatch;
    });
  }, [data, searchTerm]);

  // Initialize nominal inputs with RKAT defaults
  useEffect(() => {
    if (pilars.length === 0) return;
    const initialNominals: Record<string, string> = { ...nominalInputs };
    filteredData.forEach(item => {
      if (initialNominals[item.id] === undefined) {
        const defaultNominal = getRKATBudget(item.jenisPermohonan);
        if (defaultNominal !== undefined) {
          initialNominals[item.id] = defaultNominal.toString();
        }
      }
    });
    if (JSON.stringify(initialNominals) !== JSON.stringify(nominalInputs)) {
      setNominalInputs(initialNominals);
    }
  }, [filteredData, pilars]);

  const stats = useMemo(() => {
    const penentuanData = data.filter(d => d.status === 'Penentuan Nominal');
    return {
      total: penentuanData.length,
      urgent: penentuanData.filter(d => d.urgencyLevel === 'Kritis' || d.urgencyLevel === 'Tinggi').length,
      pending: penentuanData.filter(d => !d.nominal).length
    };
  }, [data]);

  const handleNominalChange = (id: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setNominalInputs(prev => ({ ...prev, [id]: numericValue }));
  };

  const handleAlasanChange = (id: string, value: string) => {
    setAlasanInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleResetToRKAT = (id: string, jenis: string) => {
    const defaultValue = getRKATBudget(jenis);
    if (defaultValue !== undefined) {
      setNominalInputs(prev => ({ ...prev, [id]: defaultValue.toString() }));
      setAlasanInputs(prev => {
        const newAlasan = { ...prev };
        delete newAlasan[id];
        return newAlasan;
      });
    }
  };

  const handleSetTipe = async (id: string, tipe: 'Tunai' | 'Barang') => {
    try {
      await axios.put(`http://127.0.0.1:4000/api/proposals/${id}`, {
        tipe_bantuan: tipe
      });
      const updatedData = data.map(item => 
        item.id === id ? { ...item, tipeBantuan: tipe } : item
      );
      onUpdate(updatedData);
    } catch (e) {
      alert('Gagal update tipe bantuan');
    }
  };

  const handleApprove = async (id: string) => {
    const item = data.find(d => d.id === id);
    if (!item) return;

    const nominalStr = nominalInputs[id] || '0';
    const nominal = parseInt(nominalStr);
    const defaultNominal = getRKATBudget(item.jenisPermohonan);
    const alasan = alasanInputs[id] || '';
    
    if (nominal <= 0) {
      alert('Mohon tentukan nominal bantuan.');
      return;
    }

    if (defaultNominal !== undefined && nominal !== defaultNominal && !alasan.trim()) {
      alert('Mohon isi alasan perubahan nominal karena tidak sesuai dengan RKAT.');
      return;
    }

    if (!item.tipeBantuan) {
      alert('Mohon tentukan tipe bantuan (Tunai/Barang).');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.put(`http://127.0.0.1:4000/api/proposals/${id}`, {
        nominal,
        alasan_perubahan_nominal: (defaultNominal !== undefined && nominal !== defaultNominal) ? alasan : undefined,
        status: 'Antrean_Bantuan'
      });

      const updatedData = data.map(p => 
        p.id === id ? { 
          ...p, 
          nominal, 
          status: 'Antrean Bantuan' as any,
          alasanPerubahanNominal: (defaultNominal !== undefined && nominal !== defaultNominal) ? alasan : undefined
        } : p
      );
      onUpdate(updatedData);
    } catch {
      alert('Gagal memproses penentuan nominal.');
    } finally {
      setIsSubmitting(false);
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
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center">
          <span className="text-slate-400">Persetujuan</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Penentuan Nominal</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Penentuan Nominal Bantuan
        </h2>
        <p className="text-slate-500 font-medium">
          Tahap penentuan besaran nominal dan tipe bantuan oleh Wakil Ketua berdasarkan SOP RKAT.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Menunggu" 
          value={stats.total.toString()} 
          icon={<FileText className="size-5" />}
          color="primary"
        />
        <StatCard 
          title="Urgensi Tinggi" 
          value={stats.urgent.toString()} 
          icon={<AlertTriangle className="size-5" />}
          color="red"
        />
        <StatCard 
          title="Belum Ditentukan" 
          value={stats.pending.toString()} 
          icon={<Banknote className="size-5" />}
          color="amber"
        />
      </div>

      <div className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
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

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4">No. Agenda</th>
                <th className="px-6 py-4">Mustahik</th>
                <th className="px-6 py-4">Program & Jenis</th>
                <th className="px-6 py-4">Nominal Bantuan</th>
                <th className="px-6 py-4">Tipe Bantuan</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map((item) => {
                const defaultNominal = getRKATBudget(item.jenisPermohonan);
                const currentNominal = parseInt(nominalInputs[item.id] || '0');
                const isDifferentFromRKAT = defaultNominal !== undefined && currentNominal !== defaultNominal;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group align-top">
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                        {item.agendaNo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-slate-900">{item.namaPemohon}</p>
                        <p className="text-[10px] text-slate-400 font-medium tracking-wider">{item.nik || '-'}</p>
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
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                            <input 
                              type="text"
                              value={nominalInputs[item.id] !== undefined ? nominalInputs[item.id] : (item.nominal?.toString() || '')}
                              onChange={(e) => handleNominalChange(item.id, e.target.value)}
                              placeholder="0"
                              className={cn(
                                "pl-8 pr-4 py-1.5 w-36 text-sm bg-slate-50 border-slate-200 rounded-lg focus:ring-primary focus:border-primary outline-none font-bold text-slate-900",
                                isDifferentFromRKAT && "border-amber-300 ring-1 ring-amber-100"
                              )}
                            />
                          </div>
                          {isDifferentFromRKAT && (
                            <button 
                              onClick={() => handleResetToRKAT(item.id, item.jenisPermohonan)}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                              title="Reset ke RKAT"
                            >
                              <RotateCcw className="size-3.5" />
                            </button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                          {defaultNominal !== undefined ? (
                            <>
                              <Info className="size-3" />
                              <span>RKAT: {formatCurrency(defaultNominal)}</span>
                            </>
                          ) : (
                            <span className="italic">Belum ada budget RKAT</span>
                          )}
                        </div>

                        {isDifferentFromRKAT && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-1.5"
                          >
                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                              Alasan Perubahan
                              <span className="text-rose-500">*</span>
                            </label>
                            <textarea 
                              value={alasanInputs[item.id] || ''}
                              onChange={(e) => handleAlasanChange(item.id, e.target.value)}
                              placeholder="Jelaskan alasan perubahan nominal..."
                              className="w-full text-[11px] bg-amber-50/50 border border-amber-200 rounded-lg p-2 focus:ring-amber-500 focus:border-amber-500 outline-none min-h-[60px] resize-none font-medium"
                            />
                          </motion.div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleSetTipe(item.id, 'Tunai')}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold border transition-all",
                            item.tipeBantuan === 'Tunai' 
                              ? "bg-primary text-white border-primary" 
                              : "bg-white text-slate-400 border-slate-200 hover:border-primary/50"
                          )}
                        >
                          Tunai
                        </button>
                        <button 
                          onClick={() => handleSetTipe(item.id, 'Barang')}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold border transition-all",
                            item.tipeBantuan === 'Barang' 
                              ? "bg-primary text-white border-primary" 
                              : "bg-white text-slate-400 border-slate-200 hover:border-primary/50"
                          )}
                        >
                          Barang
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
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
                        <button 
                          disabled={isSubmitting}
                          onClick={() => handleApprove(item.id)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-[10px] font-black rounded-lg shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                          {isSubmitting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserCheck className="size-3" />}
                          SETUJU
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="size-12 opacity-10" />
                      <p className="text-sm font-medium">Tidak ada data yang menunggu penentuan nominal.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                  <h3 className="text-xl font-black text-slate-900">Detail Permohonan</h3>
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
                        <DetailItem label="NIK" value={selectedProposal.nik || '-'} />
                        <DetailItem label="Alamat" value={selectedProposal.alamat || '-'} />
                        <DetailItem label="Kelurahan" value={selectedProposal.kelurahan || '-'} />
                        <DetailItem label="Kecamatan" value={selectedProposal.kecamatan || '-'} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Hasil Survei</h4>
                      <div className="space-y-4">
                        <DetailItem label="Skor Survei" value={selectedProposal.score?.toString() || '0'} />
                        <DetailItem label="Urgensi" value={selectedProposal.urgencyLevel || 'Normal'} />
                        <DetailItem label="Catatan Kepala Pelaksana" value={selectedProposal.catatanKepala || '-'} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
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

function StatCard({ title, value, icon, color }: { 
  title: string, 
  value: string, 
  icon: React.ReactNode,
  color: 'primary' | 'emerald' | 'amber' | 'red'
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-500',
    red: 'bg-red-50 text-red-600'
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
      </div>
    </div>
  );
}
